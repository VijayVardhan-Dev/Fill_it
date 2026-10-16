import { resetGraph, saveLearnedField, syncGraph, writeGraph } from '../core/db';
import { executeLiveAi } from '../core/aiCoPilotEngine';
import type { RuntimeMessage } from '../core/types';

export default defineBackground(() => {
  void syncGraph();

  browser.runtime.onMessage.addListener((message: RuntimeMessage) => {
    if (message.type === 'SAVE_LEARNED_FIELD' && message.field) {
      return saveLearnedField(message.field);
    }
    if (message.type === 'UPDATE_GRAPH' && message.graph) {
      return writeGraph(message.graph).then(() => message.graph);
    }
    if (message.type === 'RESET_DEFAULT_GRAPH') return resetGraph();
    if (message.type === 'GET_GRAPH') return syncGraph();
    if (['ASK_AI_COPILOT', 'GENERATE_TEXTAREA_DRAFTS', 'PARSE_RESUME_TEXT'].includes(message.type)) {
      return syncGraph().then((graph) => executeLiveAi(message, graph));
    }
    return false;
  });
});
