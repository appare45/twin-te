import {
  AsyncDuckDB,
  AsyncDuckDBConnection,
  DuckDBDataProtocol,
} from "@duckdb/duckdb-wasm";
import { CourseLocationInfo } from "~/domain/courseLocation";

export class ClassRoomWithDuckdb implements CourseLocationInfo {
  private db: AsyncDuckDB;
  private connection: AsyncDuckDBConnection;

  private readonly range = "A5:S";
  private readonly tablename = "KDB";

  constructor(db: AsyncDuckDB, connection: AsyncDuckDBConnection) {
    this.db = db;
    this.connection = connection;
    this.connection.query(
      `CREATE TABLE IF NOT EXISTS ${this.tablename} (科目番号 VARCHAR NOT NULL, 教室 VARCHAR, データ更新日 TIMESTAMP, PRIMARY KEY (科目番号, データ更新日));`
    );
  }

  uploadAt = async () =>
    new Date(
      (
        await this.connection.query(`
      SELECT MAX(データ更新日) AS latest FROM ${this.tablename}
      `)
      )
        .toArray()[0]
        .toJSON().latest
    );

  private loadEXCELQuery = () =>
    this.connection.prepare(
      `
        INSERT OR IGNORE INTO ${this.tablename}
        (
          SELECT 科目番号, 教室, データ更新日
          FROM read_xlsx( ? , range = "${this.range}", header = true, stop_at_empty = true)
          WHERE 科目番号 is not NULL and 教室 is not NULL
        )
      `
    );

  lengthQuery = () =>
    this.connection.prepare(`SELECT count(*) FROM ${this.tablename}`);

  locationQuery = () =>
    this.connection.prepare(
      `SELECT 教室 FROM ${this.tablename} WHERE 科目番号 = ?`
    );

  length = async () => {
    const statement = await this.lengthQuery();
    const length = await statement.query();
    return JSON.parse(length.toArray()[0])["count_star()"] ?? 0;
  };

  getLocation = async (id: string) => {
    const statement = await this.locationQuery();
    const res = await statement.query(id);
    statement.close();
    return res.get(0)?.toJSON()["教室"] ?? "";
  };

  async load(file: File) {
    await this.db.registerFileHandle(
      file.name,
      file,
      DuckDBDataProtocol.BROWSER_FILEREADER,
      true
    );
    const statement = await this.loadEXCELQuery();
    statement.query(file.name);
    statement.close();
    this.db.dropFile(file.name);
    return this;
  }
}
