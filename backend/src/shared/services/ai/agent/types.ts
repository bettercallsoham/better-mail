import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

export const ChatGraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  currentTool: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
});

export type ChatGraphStateType = typeof ChatGraphState.State;

export interface LangGraphConfig {
  configurable: {
    thread_id: string;
    userId: string;
  };
}
