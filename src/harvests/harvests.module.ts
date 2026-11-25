import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CropsModule } from '../crops/crops.module';
import { Harvest } from './entities/harvest.entity';
import { HarvestsController } from './harvests.controller';
import { HarvestsService } from './harvests.service';

@Module({
  imports: [AuthModule, CropsModule, TypeOrmModule.forFeature([Harvest])],
  controllers: [HarvestsController],
  providers: [HarvestsService],
})
export class HarvestsModule {}
