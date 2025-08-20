import { ResponseTransformInterceptor } from '../interceptors/response-transform.interceptor';

export const setupGlobalInterceptors = (app: any) => {
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
};
