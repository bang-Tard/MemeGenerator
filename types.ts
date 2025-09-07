
export interface Source {
  uri: string;
  title: string;
}

export interface MemeResult {
  imageUrl: string;
  text: string;
  sources?: Source[];
}
