import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  // Useful for graceful shutdown in dev/prod.
  async enableShutdownHooks(app: INestApplication) {
    // Prisma's lifecycle event typings differ across versions/tooling.
    // We keep shutdown behavior via process signals instead of relying on $on('beforeExit').
    const shutdown = async () => {
      await app.close();
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}

