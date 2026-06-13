import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskEntity } from '../../tasks/persistence/task.entity';
import { UserEntity } from '../../users/persistence/user.entity';
import { ProjectStatus } from '../domain/project-status.enum';

@Entity({ name: 'projects' })
@Index('IDX_projects_owner_id', ['ownerId'])
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_projects_id',
  })
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    enumName: 'project_status_enum',
    default: ProjectStatus.Active,
  })
  status!: ProjectStatus;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.projects, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_projects_owner_id_users_id',
  })
  owner!: UserEntity;

  @OneToMany(() => TaskEntity, (task) => task.project)
  tasks!: TaskEntity[];
}
