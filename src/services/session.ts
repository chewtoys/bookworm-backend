import { Redis } from "ioredis";
import * as ms from "ms";
import * as uuid from "uuid";
import { IApplicationUserData } from "../modules/user/user.contracts";
import { redisClient } from "./redis-client";

export interface IUserSession extends IApplicationUserData {
  sessionId: string;
}

const pkg = require("./../../package.json");

const APP = pkg.name;

export const SESSION_DURATION_IN_SECS =
  ms(process.env.SESSION_DURATION || "1d") / 1000;

class Session {
  constructor(private redisClient: Redis) {}

  /**
   * Creates a user session which will expire after a set time.
   *
   * @param user - logged in user
   *
   * @returns session
   */
  async create(user: IApplicationUserData) {
    const sessionId = uuid();
    const userSession = JSON.stringify(user, null, 2);

    await this.redisClient.setex(
      `${APP}:session:${sessionId}`,
      SESSION_DURATION_IN_SECS,
      userSession
    );

    return {
      sessionId,
      ...user
    } as IUserSession;
  }

  async getById(sessionId: string) {
    const session = await this.redisClient.get(`${APP}:session:${sessionId}`);

    if (!session) {
      return null;
    }

    try {
      return JSON.parse(session) as IApplicationUserData;
    } catch (error) {
      return null;
    }
  }

  refresh(sessionId: string, user: IApplicationUserData) {
    // the session should automatically expire after a given time
    return this.redisClient.setex(
      `${APP}:session:${sessionId}`,
      SESSION_DURATION_IN_SECS,
      JSON.stringify(user, null, 2)
    );
  }

  delete(sessionId: string) {
    return this.redisClient.del(`${APP}:session:${sessionId}`);
  }
}

export const sessionService = new Session(redisClient);
