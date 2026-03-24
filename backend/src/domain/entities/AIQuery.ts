export interface AIQuery {
  id: string;
  userId: string;
  question: string;
  response: string;
  modelUsed: string;
  tokensUsed: number;
  createdAt: Date;
}
