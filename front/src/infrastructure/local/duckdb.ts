import {
  AsyncDuckDB,
  AsyncDuckDBConnection,
  ConsoleLogger,
  DuckDBAccessMode,
  DuckDBBundle,
  DuckDBBundles,
  selectBundle,
} from "@duckdb/duckdb-wasm";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";

const MANUAL_BUNDLE: DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};

export class DuckDBManager {
  private db: AsyncDuckDB;
  private logger: ConsoleLogger;
  private worker: Worker;
  private connection: AsyncDuckDBConnection | undefined;
  excelEnalbled = false;

  private constructor(private bundle: DuckDBBundle) {
    this.logger = new ConsoleLogger();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.worker = new Worker(this.bundle.mainWorker!);
    this.db = new AsyncDuckDB(this.logger, this.worker);
  }

  private async initExcel(): Promise<void> {
    await (await this.getConnection()).query(
      "INSTALL excel FROM core_nightly; LOAD excel;"
    );
    this.excelEnalbled = true;
  }

  static async initialize(): Promise<DuckDBManager> {
    const bundle = await selectBundle(MANUAL_BUNDLE);
    const dbm = new DuckDBManager(bundle);
    await dbm.db.instantiate(dbm.bundle.mainModule, dbm.bundle.pthreadWorker);
    await dbm.db.open({
      path: "opfs://duckdb-wasm-parquet.db",
      accessMode: DuckDBAccessMode.READ_WRITE,
    });
    await dbm.initExcel();
    return dbm;
  }

  public getDatabase(): AsyncDuckDB {
    return this.db;
  }

  public async getConnection(): Promise<AsyncDuckDBConnection> {
    if (!this.connection) this.connection = await this.db.connect();
    return this.connection;
  }
}
