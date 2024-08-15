import type {
  LucidModel,
  ModelQueryBuilderContract,
} from "@adonisjs/lucid/types/model";
import type { DatabaseQueryBuilderContract } from "@adonisjs/lucid/types/querybuilder";

import { DateTime, Duration, Interval } from "luxon";
import db from "@adonisjs/lucid/services/db";

export class Trend {
  #interval: "minute" | "hour" | "day" | "month" | "year" = "month";
  #start?: DateTime;
  #end?: DateTime;
  #dateColumn = "created_at";
  #dateAlias = "date";

  constructor(
    public builder:
      | DatabaseQueryBuilderContract<any>
      | ModelQueryBuilderContract<any, any>,
  ) {}

  static model(model: LucidModel) {
    return new this(model.query());
  }

  static query(builder: DatabaseQueryBuilderContract<any>) {
    return new this(builder);
  }

  between(start: DateTime, end: DateTime = DateTime.now()) {
    this.#start = start;
    this.#end = end;
    return this;
  }

  interval(interval: "minute" | "hour" | "day" | "month" | "year") {
    this.#interval = interval;
    return this;
  }

  perMinute() {
    return this.interval("minute");
  }

  perHour() {
    return this.interval("hour");
  }

  perDay() {
    return this.interval("day");
  }

  perMonth() {
    return this.interval("month");
  }

  perYear() {
    return this.interval("year");
  }

  dateColumn(column: string) {
    this.#dateColumn = column;
    return this;
  }

  dateAlias(alias: string) {
    this.#dateAlias = alias;
    return this;
  }

  async aggregate(column: string, aggregate: string) {
    const values = await this.builder
      .select([
        db.raw(`${this.getSqlDate()} as ${this.#dateAlias}`),
        db.raw(`${aggregate}(${column}) as aggregate`),
      ])
      .whereBetween(this.#dateColumn, [
        this.#start!.toISO()!,
        this.#end!.toISO()!,
      ])
      .groupBy(this.#dateAlias)
      .orderBy(this.#dateAlias, "asc");

    return this.mapValuesToDates(values);
  }

  avg(column: string) {
    return this.aggregate(column, "avg");
  }

  average(column: string) {
    return this.avg(column);
  }

  min(column: string) {
    return this.aggregate(column, "min");
  }

  max(column: string) {
    return this.aggregate(column, "max");
  }

  sum(column: string) {
    return this.aggregate(column, "sum");
  }

  count(column: string = "*") {
    return this.aggregate(column, "count");
  }

  mapValuesToDates(values: any[]) {
    const vals = values.map((value) => {
      return {
        aggregate: Number(value["$extras"].aggregate ?? value.aggregate ?? 0),
        date: value["$extras"][this.#dateAlias] ?? value[this.#dateAlias],
      };
    });

    const placeholders = this.getDatePeriod().map((date) => ({
      aggregate: 0,
      date: date!.toFormat(this.getLuxonDateFormat()),
    }));

    for (const val of vals) {
      const index = placeholders.findIndex((p) => p.date === val.date);
      if (index > -1) {
        placeholders[index] = val;
      }
    }

    return placeholders;
  }

  getDatePeriod() {
    const period = Interval.fromDateTimes(this.#start!, this.#end!)
      .splitBy(Duration.fromObject({ [this.#interval]: 1 }))
      .map((i) => i.start);

    return period;
  }

  protected getSqlDate(): string {
    switch (this.builder.client.dialect.name) {
      case "postgres": {
        return this.getPostgresDateFormat();
      }
      case "mysql": {
        return this.getMysqlDateFormat();
      }
      case "sqlite3":
      case "better-sqlite3": {
        return this.getSqliteDateFormat();
      }
      default: {
        throw new Error("Unsupported database.");
      }
    }
  }

  protected getPostgresDateFormat() {
    let format: string;

    switch (this.#interval) {
      case "minute": {
        format = "YYYY-MM-DD HH24:MI:00";
        break;
      }
      case "hour": {
        format = "YYYY-MM-DD HH24:00:00";
        break;
      }
      case "day": {
        format = "YYYY-MM-DD";
        break;
      }
      case "month": {
        format = "YYYY-MM";
        break;
      }
      case "year": {
        format = "YYYY";
        break;
      }
      default: {
        throw new Error("Invalid interval.");
      }
    }

    return `to_char(${this.#dateColumn}, '${format}')`;
  }

  protected getMysqlDateFormat() {
    let format: string;

    switch (this.#interval) {
      case "minute": {
        format = "%Y-%m-%d %H:%i:00";
        break;
      }
      case "hour": {
        format = "%Y-%m-%d %H:00";
        break;
      }
      case "day": {
        format = "%Y-%m-%d";
        break;
      }
      case "month": {
        format = "%Y-%m";
        break;
      }
      case "year": {
        format = "%Y";
        break;
      }
      default: {
        throw new Error("Invalid interval.");
      }
    }

    return `to_char(${this.#dateColumn}, '${format}')`;
  }

  protected getSqliteDateFormat() {
    let format: string;

    switch (this.#interval) {
      case "minute": {
        format = "%Y-%m-%d %H:%M:00";
        break;
      }
      case "hour": {
        format = "%Y-%m-%d %H:00";
        break;
      }
      case "day": {
        format = "%Y-%m-%d";
        break;
      }
      case "month": {
        format = "%Y-%m";
        break;
      }
      case "year": {
        format = "%Y";
        break;
      }
      default: {
        throw new Error("Invalid interval.");
      }
    }

    return `to_char(${this.#dateColumn}, '${format}')`;
  }

  getLuxonDateFormat() {
    switch (this.#interval) {
      case "minute": {
        return "yyyy-MM-dd HH:mm:00";
      }
      case "hour": {
        return "yyyy-MM-dd HH:00";
      }
      case "day": {
        return "yyyy-MM-dd";
      }
      case "month": {
        return "yyyy-MM";
      }
      case "year": {
        return "yyyy";
      }
      default: {
        throw new Error("Invalid interval.");
      }
    }
  }
}
