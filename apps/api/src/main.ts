import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const trustProxy = process.env.TRUST_PROXY === "true";
  if (trustProxy) {
    // Required for correct secure-cookie behavior behind reverse proxies (NGINX, Cloudflare, etc.)
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }

  app.use(
    helmet({
      // API only; no need for CSP here (usually managed at the web/app edge)
      contentSecurityPolicy: false
    })
  );
  app.use(cookieParser());

  const nodeEnv = process.env.NODE_ENV ?? "development";
  const corsOrigins = (process.env.CORS_ORIGINS ?? "*").trim();
  const isDev = nodeEnv !== "production";
  const allowAllInDev = isDev && corsOrigins === "*";
  const allowlist = corsOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      // Server-to-server / curl (no Origin header)
      if (!origin) return cb(null, true);
      if (allowAllInDev) return cb(null, true);
      const ok = allowlist.includes(origin);
      return cb(ok ? null : new Error("CORS not allowed"), ok);
    },
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`KPBF REC API listening on port ${port}`);
}

bootstrap();

