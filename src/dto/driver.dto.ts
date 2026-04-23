import { IsOptional, IsString } from 'class-validator';

export class ResolveDto {
  @IsString()
  did: string;

  @IsOptional()
  @IsString()
  version?: string;
}
