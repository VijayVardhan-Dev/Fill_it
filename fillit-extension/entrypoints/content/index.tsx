import './style.css';
import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import type { FieldContext, FillableField } from '../../core/types';
import type { KnowledgeGraph } from '../../core/types';
import { extractFieldContext } from './contextExtractor';
import { listenForFieldInteractions } from './domListener';
import { FillItPopover } from './components/FillItPopover';
import { SilentLearnToast } from './components/SilentLearnToast';
import { getGraphSnapshot, sendGraphMessage, subscribeToGraph } from '../../core/storageBridge';
import { watchSilentLearning } from './silentLearner';
import { listenForShakeToAsk } from './shakeDetector';

function FillItController({ uiRoot }: { uiRoot: HTMLElement }) {
  const [activeField, setActiveField] = useState<FillableField | null>(null);
  const [context, setContext] = useState<FieldContext | null>(null);
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [learnCandidate, setLearnCandidate] = useState<{ field: FillableField; label: string; value: string } | null>(null);
  const [copilotField, setCopilotField] = useState<FillableField | null>(null);

  useEffect(() => {
    let mounted = true;
    void getGraphSnapshot().then((snapshot) => {
      if (mounted && snapshot) setGraph(snapshot);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => subscribeToGraph(setGraph), []);

  useEffect(() => {
    if (!graph) return;
    return watchSilentLearning(graph, (field, label, value) => setLearnCandidate({ field, label, value }));
  }, [graph]);

  useEffect(() => {
    const stopListening = listenForFieldInteractions(uiRoot, {
      onField(field) {
        try {
          // Only extract context after the user focuses or clicks an eligible field.
          setActiveField(field);
          setContext(extractFieldContext(field));
        } catch {
          setActiveField(null);
          setContext(null);
        }
      },
      onDismiss() {
        setActiveField(null);
        setContext(null);
      },
    });
    return stopListening;
  }, [uiRoot]);

  useEffect(() => listenForShakeToAsk({
    uiRoot,
    getActiveField: () => activeField,
    onAsk: (field) => {
      setActiveField(field);
      setContext(extractFieldContext(field));
      setCopilotField(field);
    },
  }), [activeField, uiRoot]);

  return (
    <>
      <FillItPopover
        field={activeField}
        context={context}
        graph={graph}
        copilot={copilotField === activeField}
        onOpenCopilot={() => activeField && setCopilotField(activeField)}
        onCloseCopilot={() => setCopilotField(null)}
        onDismiss={() => {
          setActiveField(null);
          setContext(null);
          setCopilotField(null);
        }}
      />
      {learnCandidate && graph && (
        <SilentLearnToast
          label={learnCandidate.label}
          value={learnCandidate.value}
          onDismiss={() => setLearnCandidate(null)}
          onSave={() => {
            void sendGraphMessage({
              type: 'SAVE_LEARNED_FIELD',
              field: {
                personaId: graph.activePersonaId,
                label: learnCandidate.label,
                value: learnCandidate.value,
                fieldType: learnCandidate.field.tagName.toLowerCase(),
                source: 'manual entry',
              },
            }).then((updated) => {
              if (updated) setGraph(updated);
              setLearnCandidate(null);
            });
          }}
        />
      )}
    </>
  );
}

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  matchAboutBlank: true,
  runAt: 'document_idle',
  cssInjectionMode: 'ui',

  async main(ctx) {
    try {
      if (window !== window.top) {
        try {
          // Same-origin child frames are handled by the top-level iframe bridge.
          void window.parent.document;
          return;
        } catch {
          // Cross-origin frames keep their standalone UI because the parent cannot inspect them.
        }
      }

      const ui = await createShadowRootUi(ctx, {
        name: 'fillit-shadow-ui',
        position: 'overlay',
        zIndex: 2147483647,
        onMount(container) {
          const uiRoot = document.createElement('div');
          uiRoot.dataset.fillitUiRoot = 'true';
          container.append(uiRoot);
          const root = ReactDOM.createRoot(uiRoot);
          root.render(<FillItController uiRoot={uiRoot} />);
          return root;
        },
        onRemove(root) {
          root?.unmount();
        },
      });

      ui.mount();
    } catch {
      // Restricted or unusual pages should remain untouched if UI setup fails.
    }
  },
});
