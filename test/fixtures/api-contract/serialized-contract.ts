import { Exclude } from 'class-transformer';

export class SerializedContract {
  public readonly name = 'Visible value';

  @Exclude()
  public readonly secret = 'Sensitive value';
}
