export interface ErrorContext {
    [key: string]: any;
}

export class DomainError extends Error {
    public code: string;
    public timestamp: Date;
    public context?: ErrorContext;

    constructor(message: string, code: string, context?: ErrorContext) {
        super(message);
        this.name = 'DomainError';
        this.code = code;
        this.timestamp = new Date();
        this.context = context;
    }
}

export class ApplicationError extends Error {
    public code: string;
    public timestamp: Date;
    public context?: ErrorContext;

    constructor(message: string, code: string, context?: ErrorContext) {
        super(message);
        this.name = 'ApplicationError';
        this.code = code;
        this.timestamp = new Date();
        this.context = context;
    }
}

export class InfrastructureError extends Error {
    public code: string;
    public timestamp: Date;
    public context?: ErrorContext;

    constructor(message: string, code: string, context?: ErrorContext) {
        super(message);
        this.name = 'InfrastructureError';
        this.code = code;
        this.timestamp = new Date();
        this.context = context;
    }
}
