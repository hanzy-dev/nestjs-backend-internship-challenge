import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from '../../projects/persistence/project.entity';

@Entity({ name: 'users' })
@Unique('UQ_users_email', ['email'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_users_id',
  })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ProjectEntity, (project) => project.owner)
  projects!: ProjectEntity[];
}
