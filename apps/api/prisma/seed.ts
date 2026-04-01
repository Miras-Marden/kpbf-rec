import {
  PrismaClient,
  Prisma,
  Role,
  ModerationStatus,
  FightOutcome,
  FightMethod,
  RankingScope,
  RankingStyle
} from "@prisma/client";

const prisma = new PrismaClient();

const BASE_RATING = 1500;
const BASE_K_FACTOR = 24;
const ACTIVE_INACTIVITY_GRACE_DAYS = 180;
const ACTIVE_INACTIVITY_PENALTY_PER_DAY = 0.03;
const ACTIVE_INACTIVITY_PENALTY_CAP = 200;
const RANKING_METHODOLOGY_VERSION = "v1.0.0";

const METHOD_MULTIPLIERS: Record<FightMethod, number> = {
  KO: 1.25,
  TKO: 1.2,
  UD: 1.0,
  MD: 0.95,
  SD: 0.9,
  DQ: 0.85,
  Draw: 0.75,
  NC: 0
};

function expectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

function computeInactivityPenalty(daysSinceLastBout: number | null) {
  if (daysSinceLastBout === null || daysSinceLastBout <= ACTIVE_INACTIVITY_GRACE_DAYS) {
    return 0;
  }
  const overdue = daysSinceLastBout - ACTIVE_INACTIVITY_GRACE_DAYS;
  return Math.min(ACTIVE_INACTIVITY_PENALTY_CAP, overdue * ACTIVE_INACTIVITY_PENALTY_PER_DAY);
}

async function recalculateRankingsSnapshot(seedTrigger: string) {
  const [fighters, categories, publishedBouts] = await Promise.all([
    prisma.fighter.findMany({ select: { id: true, weightCategoryId: true } }),
    prisma.weightCategory.findMany({ select: { id: true } }),
    prisma.bout.findMany({
      where: { moderationStatus: ModerationStatus.PUBLISHED },
      orderBy: [{ boutDate: "asc" }, { createdAt: "asc" }],
      select: {
        boutDate: true,
        fighterAId: true,
        fighterBId: true,
        result: true,
        method: true,
        eventId: true
      }
    })
  ]);

  const ratings = new Map<string, number>();
  const stats = new Map<string, { totalBouts: number; lastBoutAt: Date | null; wins: number; losses: number; draws: number; nc: number }>();

  for (const fighter of fighters) {
    ratings.set(fighter.id, BASE_RATING);
    stats.set(fighter.id, { totalBouts: 0, lastBoutAt: null, wins: 0, losses: 0, draws: 0, nc: 0 });
  }

  for (const bout of publishedBouts) {
    const a = stats.get(bout.fighterAId)!;
    const b = stats.get(bout.fighterBId)!;
    a.totalBouts += 1;
    b.totalBouts += 1;
    a.lastBoutAt = bout.boutDate;
    b.lastBoutAt = bout.boutDate;

    if (bout.result === "WIN") {
      a.wins += 1;
      b.losses += 1;
    } else if (bout.result === "LOSS") {
      a.losses += 1;
      b.wins += 1;
    } else if (bout.result === "DRAW") {
      a.draws += 1;
      b.draws += 1;
    } else {
      a.nc += 1;
      b.nc += 1;
    }

    if (bout.result === "NC") continue;
    const scoreA = bout.result === "WIN" ? 1 : bout.result === "LOSS" ? 0 : 0.5;
    const scoreB = bout.result === "WIN" ? 0 : bout.result === "LOSS" ? 1 : 0.5;

    const ratingA = ratings.get(bout.fighterAId) ?? BASE_RATING;
    const ratingB = ratings.get(bout.fighterBId) ?? BASE_RATING;
    const expectedA = expectedScore(ratingA, ratingB);
    const expectedB = expectedScore(ratingB, ratingA);

    const importance = bout.eventId ? 1.1 : 1.0;
    const methodMultiplier = METHOD_MULTIPLIERS[bout.method] ?? 1;
    const k = BASE_K_FACTOR * importance * methodMultiplier;

    ratings.set(bout.fighterAId, ratingA + k * (scoreA - expectedA));
    ratings.set(bout.fighterBId, ratingB + k * (scoreB - expectedB));
  }

  const now = new Date();
  const currentRows: Prisma.RankingCurrentCreateManyInput[] = [];
  const snapshotRows: Prisma.RankingSnapshotCreateManyInput[] = [];

  const addRows = (scope: RankingScope, style: RankingStyle, fighterIds: string[], weightCategoryId: string | null) => {
    const scored = fighterIds
      .map((fighterId) => {
        const base = ratings.get(fighterId);
        if (base === undefined) return null;
        const s = stats.get(fighterId);
        if (!s || s.totalBouts === 0) return null;
        const daysSinceLastBout = s.lastBoutAt
          ? Math.floor((now.getTime() - s.lastBoutAt.getTime()) / 86_400_000)
          : null;
        const penalty = style === RankingStyle.ACTIVE ? computeInactivityPenalty(daysSinceLastBout) : 0;
        return { fighterId, rating: Number((base - penalty).toFixed(3)), base, penalty, daysSinceLastBout, s };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.rating - a.rating);

    for (let i = 0; i < scored.length; i += 1) {
      const row = scored[i]!;
      const rank = i + 1;
      const explanationJson = {
        trigger: seedTrigger,
        baseRating: Number(row.base.toFixed(3)),
        inactivityPenalty: Number(row.penalty.toFixed(3)),
        finalRating: row.rating,
        daysSinceLastBout: row.daysSinceLastBout,
        record: {
          wins: row.s.wins,
          losses: row.s.losses,
          draws: row.s.draws,
          nc: row.s.nc
        },
        totalBouts: row.s.totalBouts,
        lastBoutAt: row.s.lastBoutAt?.toISOString() ?? null
      };

      currentRows.push({
        scope,
        style,
        fighterId: row.fighterId,
        weightCategoryId,
        rating: row.rating,
        rank,
        methodologyVersion: RANKING_METHODOLOGY_VERSION,
        computedAt: now,
        explanationJson
      });
      snapshotRows.push({
        snapshotAt: now,
        scope,
        style,
        fighterId: row.fighterId,
        weightCategoryId,
        rating: row.rating,
        rank,
        methodologyVersion: RANKING_METHODOLOGY_VERSION,
        explanationJson
      });
    }
  };

  const allFighterIds = fighters.map((f) => f.id);
  addRows(RankingScope.P4P, RankingStyle.ALL_TIME, allFighterIds, null);
  addRows(RankingScope.P4P, RankingStyle.ACTIVE, allFighterIds, null);

  for (const category of categories) {
    const fighterIds = fighters.filter((f) => f.weightCategoryId === category.id).map((f) => f.id);
    addRows(RankingScope.WEIGHT_CATEGORY, RankingStyle.ALL_TIME, fighterIds, category.id);
    addRows(RankingScope.WEIGHT_CATEGORY, RankingStyle.ACTIVE, fighterIds, category.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.rankingCurrent.deleteMany({});
    if (currentRows.length > 0) await tx.rankingCurrent.createMany({ data: currentRows });
    if (snapshotRows.length > 0) await tx.rankingSnapshot.createMany({ data: snapshotRows });
  });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  // Roles for initial admin
  const adminRole = Role.ADMIN;

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@kpbf-rec.test";
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";

  // NOTE: For foundation, we use a simple password hash with bcrypt in the auth module later.
  // For seed, we store a temporary hash only if the admin doesn't exist yet.
  const existingAdmin = await prisma.user.findUnique({
    where: { email: seedAdminEmail }
  });

  let admin = existingAdmin;
  if (!admin) {
    const bcrypt = await import("bcrypt");
    const passwordHash = await bcrypt.hash(seedAdminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: seedAdminEmail,
        passwordHash,
        displayName: "KPBF REC Admin",
        roles: { create: [{ role: adminRole }] }
      }
    });
  }

  // Weight categories (initial subset)
  const weightCategories = [
    { name: "Flyweight (52 kg)", slug: "flyweight-52", weightKg: 52 },
    { name: "Lightweight (60 kg)", slug: "lightweight-60", weightKg: 60 },
    { name: "Welterweight (67 kg)", slug: "welterweight-67", weightKg: 67 },
    { name: "Light Heavyweight (81 kg)", slug: "light-heavyweight-81", weightKg: 81 }
  ];

  await Promise.all(
    weightCategories.map((c) =>
      prisma.weightCategory.upsert({
        where: { slug: c.slug },
        update: { name: c.name, weightKg: c.weightKg },
        create: { slug: c.slug, name: c.name, weightKg: c.weightKg }
      })
    )
  );

  const categories = await prisma.weightCategory.findMany();
  const w = (slug: string) => categories.find((x) => x.slug === slug)!;

  // Seed fighters (6)
  const fighters = [
    {
      fullName: "Aidos Nurzhan",
      nationality: "Kazakhstan",
      regionCity: "Almaty",
      dateOfBirth: new Date("1998-05-12"),
      weightCategoryId: w("lightweight-60").id
    },
    {
      fullName: "Yerbol Zhumat",
      nationality: "Kazakhstan",
      regionCity: "Shymkent",
      dateOfBirth: new Date("1996-11-03"),
      weightCategoryId: w("lightweight-60").id
    },
    {
      fullName: "Arlan Sadvakassov",
      nationality: "Kazakhstan",
      regionCity: "Karaganda",
      dateOfBirth: new Date("1999-01-20"),
      weightCategoryId: w("welterweight-67").id
    },
    {
      fullName: "Nurlan Askar",
      nationality: "Kazakhstan",
      regionCity: "Astana",
      dateOfBirth: new Date("1997-08-18"),
      weightCategoryId: w("welterweight-67").id
    },
    {
      fullName: "Dias Tolegen",
      nationality: "Kazakhstan",
      regionCity: "Aktobe",
      dateOfBirth: new Date("2000-02-02"),
      weightCategoryId: w("flyweight-52").id
    },
    {
      fullName: "Serik Zhanibek",
      nationality: "Kazakhstan",
      regionCity: "Pavlodar",
      dateOfBirth: new Date("1995-06-30"),
      weightCategoryId: w("light-heavyweight-81").id
    }
  ];

  const createdFighters = await Promise.all(
    fighters.map((f) =>
      prisma.fighter.upsert({
        where: { slug: slugify(f.fullName) },
        update: {
          fullName: f.fullName,
          nationality: f.nationality,
          regionCity: f.regionCity,
          dateOfBirth: f.dateOfBirth,
          weightCategoryId: f.weightCategoryId,
          moderationStatus: ModerationStatus.PUBLISHED,
          updatedByUserId: admin!.id,
          approvedByUserId: admin!.id,
          publishedAt: new Date()
        },
        create: {
          slug: slugify(f.fullName),
          fullName: f.fullName,
          nationality: f.nationality,
          regionCity: f.regionCity,
          dateOfBirth: f.dateOfBirth,
          moderationStatus: ModerationStatus.PUBLISHED,
          createdByUserId: admin!.id,
          updatedByUserId: admin!.id,
          approvedByUserId: admin!.id,
          publishedAt: new Date(),
          weightCategoryId: f.weightCategoryId
        }
      })
    )
  );

  const fighterByName = (name: string) => createdFighters.find((x) => x.fullName === name)!;

  // Seed events (3)
  const events = [
    {
      slug: "kpbf-open-2025-04",
      name: "KPBF Open Championship 2025 (April)",
      eventDate: new Date("2025-04-14"),
      city: "Almaty",
      country: "Kazakhstan"
    },
    {
      slug: "kpbf-cup-2024-09",
      name: "KPBF Cup 2024 (September)",
      eventDate: new Date("2024-09-01"),
      city: "Shymkent",
      country: "Kazakhstan"
    },
    {
      slug: "regional-series-2025-01",
      name: "Regional Boxing Series 2025 (January)",
      eventDate: new Date("2025-01-20"),
      city: "Karaganda",
      country: "Kazakhstan"
    }
  ];

  const createdEvents = await Promise.all(
    events.map((e) =>
      prisma.event.upsert({
        where: { slug: e.slug },
        update: {
          name: e.name,
          eventDate: e.eventDate,
          city: e.city,
          country: e.country,
          moderationStatus: ModerationStatus.PUBLISHED,
          updatedByUserId: admin!.id,
          approvedByUserId: admin!.id,
          publishedAt: new Date()
        },
        create: {
          slug: e.slug,
          name: e.name,
          eventDate: e.eventDate,
          city: e.city,
          country: e.country,
          moderationStatus: ModerationStatus.PUBLISHED,
          createdByUserId: admin!.id,
          updatedByUserId: admin!.id,
          approvedByUserId: admin!.id,
          publishedAt: new Date()
        }
      })
    )
  );

  const eventBySlug = (slug: string) => createdEvents.find((x) => x.slug === slug)!;

  // Seed bouts (6) - result stored from fighterA perspective.
  const bouts = [
    {
      slug: "nurzhan-vs-zhumat-2025-04-14",
      boutDate: new Date("2025-04-14"),
      fighterA: fighterByName("Aidos Nurzhan").id,
      fighterB: fighterByName("Yerbol Zhumat").id,
      result: FightOutcome.WIN,
      method: FightMethod.MD,
      eventSlug: "kpbf-open-2025-04"
    },
    {
      slug: "zhumat-vs-nurzhan-2024-09-01",
      boutDate: new Date("2024-09-01"),
      fighterA: fighterByName("Yerbol Zhumat").id,
      fighterB: fighterByName("Aidos Nurzhan").id,
      result: FightOutcome.WIN,
      method: FightMethod.UD,
      eventSlug: "kpbf-cup-2024-09"
    },
    {
      slug: "sadvakassov-vs-askar-2025-01-20",
      boutDate: new Date("2025-01-20"),
      fighterA: fighterByName("Arlan Sadvakassov").id,
      fighterB: fighterByName("Nurlan Askar").id,
      result: FightOutcome.DRAW,
      method: FightMethod.Draw,
      eventSlug: "regional-series-2025-01"
    },
    {
      slug: "askar-vs-nurzhan-2025-04-14",
      boutDate: new Date("2025-04-14"),
      fighterA: fighterByName("Nurlan Askar").id,
      fighterB: fighterByName("Aidos Nurzhan").id,
      result: FightOutcome.LOSS,
      method: FightMethod.SD,
      eventSlug: "kpbf-open-2025-04"
    },
    {
      slug: "tolegen-vs-zhumat-2024-09-01",
      boutDate: new Date("2024-09-01"),
      fighterA: fighterByName("Dias Tolegen").id,
      fighterB: fighterByName("Yerbol Zhumat").id,
      result: FightOutcome.LOSS,
      method: FightMethod.TKO,
      eventSlug: "kpbf-cup-2024-09"
    },
    {
      slug: "zhanibek-vs-askar-2025-01-20",
      boutDate: new Date("2025-01-20"),
      fighterA: fighterByName("Serik Zhanibek").id,
      fighterB: fighterByName("Nurlan Askar").id,
      result: FightOutcome.WIN,
      method: FightMethod.KO,
      eventSlug: "regional-series-2025-01"
    }
  ];

  await Promise.all(
    bouts.map((b) =>
      prisma.bout.upsert({
        where: { slug: b.slug },
        update: {
          boutDate: b.boutDate,
          fighterAId: b.fighterA,
          fighterBId: b.fighterB,
          result: b.result,
          method: b.method,
          eventId: eventBySlug(b.eventSlug).id,
          venue: "Main Arena",
          city: eventBySlug(b.eventSlug).city,
          country: eventBySlug(b.eventSlug).country,
          referee: "Official Referee",
          moderationStatus: ModerationStatus.PUBLISHED,
          updatedByUserId: admin!.id,
          approvedByUserId: admin!.id,
          publishedAt: new Date()
        },
        create: {
          slug: b.slug,
          boutDate: b.boutDate,
          fighterAId: b.fighterA,
          fighterBId: b.fighterB,
          result: b.result,
          method: b.method,
          eventId: eventBySlug(b.eventSlug).id,
          venue: "Main Arena",
          city: eventBySlug(b.eventSlug).city,
          country: eventBySlug(b.eventSlug).country,
          referee: "Official Referee",
          moderationStatus: ModerationStatus.PUBLISHED,
          createdByUserId: admin!.id,
          updatedByUserId: admin!.id,
          approvedByUserId: admin!.id,
          publishedAt: new Date()
        }
      })
    )
  );

  await recalculateRankingsSnapshot("seed.bootstrap");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

