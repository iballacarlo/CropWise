import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Crop } from './entities/crop.entity';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Crop])],
  controllers: [CropsController],
  providers: [CropsService],
  exports: [CropsService],
})
export class CropsModule {}
