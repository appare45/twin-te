export interface CourseLocationInfo {
  uploadAt: () => Promise<Date>;
  getLocation: (id: string) => Promise<string>;
  length: () => Promise<number>;
}
