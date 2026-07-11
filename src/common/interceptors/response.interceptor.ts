import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (this.isApiResponse(payload)) return payload;
        return {
          success: true,
          message: 'Success',
          data: payload,
        };
      }),
    );
  }

  private isApiResponse(value: unknown): value is ApiResponse<T> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'success' in value &&
      'message' in value
    );
  }
}
