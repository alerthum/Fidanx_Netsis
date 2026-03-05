import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof Error ? exception.message : 'Internal server error';
        const stack = exception instanceof Error ? exception.stack : null;

        console.error('[GlobalFilter] Error:', exception);

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: message,
            error: exception instanceof HttpException ? exception.getResponse() : null,
            stack: process.env.NODE_ENV !== 'production' ? stack : null,
        });
    }
}

let app;

async function bootstrap() {
    const app = await NestFactory.create(AppModule, new ExpressAdapter());

    // Global Exception Filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // Global Prefix
    app.setGlobalPrefix('api');

    // CORS
    app.enableCors({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    await app.init();
    return app.getHttpAdapter().getInstance();
}

export default async (req, res) => {
    if (!app) {
        app = await bootstrap();
    }
    app(req, res);
};
