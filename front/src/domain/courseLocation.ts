export interface CourseLocationInfo {
  uploadAt: Date;
  getLocation: (id: string) => Promise<string>;
  length: () => Promise<number>;
}
