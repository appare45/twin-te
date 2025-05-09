export interface CourseLocationInfo {
  uploadAt: Date;
  getLocation: (id: string) => string;
  length: number;
}
