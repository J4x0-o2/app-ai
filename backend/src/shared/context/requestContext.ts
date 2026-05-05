import { AsyncLocalStorage } from 'async_hooks';

interface RequestStore {
    correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

export const getCorrelationId = (): string =>
    requestContext.getStore()?.correlationId ?? 'no-context';
