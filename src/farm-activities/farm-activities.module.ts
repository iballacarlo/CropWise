import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CropsModule } from '../crops/crops.module';
import { FarmActivity } from './entities/farm-activity.entity';
import { FarmActivitiesController } from './farm-activities.controller';
import { FarmActivitiesService } from './farm-activities.service';

@Module({
  imports: [AuthModule, CropsModule, TypeOrmModule.forFeature([FarmActivity])],
  controllers: [FarmActivitiesController],
  providers: [FarmActivitiesService],
})
export class FarmActivitiesModule {}
