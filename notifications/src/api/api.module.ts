import { Global, Module } from '@nestjs/common';
import { IApi } from './api.contract.js';
import { HttpApiService } from './http-api.service.js';

@Global()
@Module({
  providers: [{ provide: IApi, useClass: HttpApiService }],
  exports: [IApi],
})
export class ApiModule {}
