import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment.validation';
import {
  buildDataSourceOptions,
  getDatabaseSettingsFromEnvironment,
} from './database.config';

const environment = validateEnvironment(process.env);

export default new DataSource(
  buildDataSourceOptions(getDatabaseSettingsFromEnvironment(environment)),
);
