import {
  AsyncDuckDB,
  AsyncDuckDBConnection,
  DuckDBDataProtocol,
} from "@duckdb/duckdb-wasm";
import { CourseLocationInfo } from "~/domain/courseLocation";

export class ClassRoomWithDuckdb implements CourseLocationInfo {
  readonly uploadAt: Date;
  private file: File;
  private db: AsyncDuckDB;

  private connection: AsyncDuckDBConnection;

  private readonly range = "A5:S";
  private readonly tablename = "KDB";

  private constructor(
    file: File,
    db: AsyncDuckDB,
    connection: AsyncDuckDBConnection
  ) {
    this.file = file;
    this.db = db;
    this.connection = connection;
    this.uploadAt = new Date();
  }

  private loadEXCELQuery = () =>
    this.connection.prepare(
      `
        INSERT INTO ${this.tablename}
        (
          SELECT 科目番号, 教室, データ更新日
          FROM read_xlsx("${this.file.name}", range = "${this.range}", header = true)
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
    console.log(res.get(0)?.toJSON());
    return res.get(0)?.toJSON()["教室"] ?? "";
  };

  static async load(
    file: File,
    db: AsyncDuckDB,
    connection: AsyncDuckDBConnection
  ) {
    const P = new ClassRoomWithDuckdb(file, db, connection);
    await P.db.registerFileHandle(
      P.file.name,
      P.file,
      DuckDBDataProtocol.BROWSER_FILEREADER,
      true
    );
    P.connection.query(
      `CREATE TABLE ${P.tablename} (科目番号 VARCHAR NOT NULL, 教室 VARCHAR, データ更新日 TIMESTAMP, PRIMARY KEY (科目番号, データ更新日));`
    );
    const statement = await P.loadEXCELQuery();
    statement.query();
    const res = await P.connection.query(
      `SELECT * from ${P.tablename} WHERE 教室 is not NULL`
    );
    console.log(JSON.parse(res.toArray()[0]));
    statement.close();
    return P;
  }
}
