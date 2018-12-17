import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique
} from "sequelize-typescript";
import ApplicationUser from "./ApplicationUser";
import SubscriptionPlan from "./SubscriptionPlan";

@Table({ tableName: "user_subscription" })
export default class UserSubscription extends Model<UserSubscription> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: string;

  @Unique
  @Column
  name: string;

  @Column({ field: "subscribed_at", type: DataType.DATE })
  subscribedAt: Date;

  @Column({ field: "expires_at", type: DataType.DATE })
  expiresAt: Date;

  @Column({ field: "books_per_month", type: DataType.SMALLINT })
  booksPerMonth: number;

  @Column({ field: "price_per_month", type: DataType.DECIMAL.UNSIGNED })
  pricePerMonth: number;

  /**
   * Foreign key - User
   */
  @BelongsTo(() => ApplicationUser)
  user: ApplicationUser;

  @ForeignKey(() => ApplicationUser)
  @Column({ field: "user_id", type: DataType.BIGINT })
  userId: string;

  /**
   * Foreign key - Subscription Plan
   */
  @BelongsTo(() => SubscriptionPlan)
  plan: SubscriptionPlan;

  @ForeignKey(() => SubscriptionPlan)
  @Column({ field: "subscription_plan_id", type: DataType.BIGINT })
  subscriptionPlanId: string;
}
