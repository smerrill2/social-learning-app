import { IsString, IsOptional, IsArray, IsNumber, IsUrl } from 'class-validator';

export class CreateBookDto {
  @IsString()
  title: string;

  @IsString()
  author: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genre?: string[];

  @IsOptional()
  @IsNumber()
  publishedYear?: number;

  @IsOptional()
  @IsNumber()
  pageCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}