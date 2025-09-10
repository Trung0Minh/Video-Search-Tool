import { Component, createSignal, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Modal from './components/Modal';
import VideoModal from './components/VideoModal';
import KeyframeModal from './components/KeyframeModal';
import TopPanel from './components/TopPanel';
import ImageModal from './components/ImageModal';

export interface SearchResultItem {
  video_id: string;
  keyframe_id: string;
  keyframe_index: number;
  image_url: string;
  video_url: string;
}

export interface TemporalQueryResult {
  video_id: string;
  video_url: string;
  query_results: {
    query: string;
    keyframes: {
      keyframe_id: string;
      keyframe_index: number;
      image_url: string;
    }[];
  }[];
}

export interface QueryItem {
  id: number;
  text: string;
}

let queryIdCounter = 1;

const App: Component = () => {
  const [queries, setQueries] = createStore<QueryItem[]>([{ id: queryIdCounter++, text: '' }]);
  const [retriever, setRetriever] = createSignal('clip');
  const [topKPerQuery, setTopKPerQuery] = createSignal(10);
  const [keywordFilter, setKeywordFilter] = createSignal('');
  const [objectFilter, setObjectFilter] = createSignal('');
  const [results, setResults] = createSignal<SearchResultItem[]>([]);
  const [temporalResults, setTemporalResults] = createSignal<TemporalQueryResult[]>([]);
  const [isTemporalResult, setIsTemporalResult] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [modalStack, setModalStack] = createSignal<any[]>([]);
  const [displayVideoId, setDisplayVideoId] = createSignal('');
  const [displayKeyframeId, setDisplayKeyframeId] = createSignal('');
  const [keyframeNote, setKeyframeNote] = createSignal('');
  const [submissionFilename, setSubmissionFilename] = createSignal('submission');
  const [submissionContent, setSubmissionContent] = createSignal('');

  const [modalVideoId, setModalVideoId] = createSignal('');
  const [modalKeyframeId, setModalKeyframeId] = createSignal('');
  const [modalNote, setModalNote] = createSignal('');
  const [isTemporalMode, setIsTemporalMode] = createSignal(false);

  const [gridCols, setGridCols] = createSignal(3);
  const [groupByVideo, setGroupByVideo] = createSignal(false);
  const [leftPanelWidth, setLeftPanelWidth] = createSignal(300);

  const API_BASE_URL = "http://localhost:8000";

  const addQuery = () => setQueries(queries.length, { id: queryIdCounter++, text: '' });
  const removeQuery = (id: number) => setQueries(q => q.filter(item => item.id !== id));
  const updateQuery = (id: number, text: string) => setQueries(q => q.id === id, 'text', text);

  let startX: number;
  let startWidth: number;

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    startX = e.clientX;
    startWidth = leftPanelWidth();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - startX;
    let newWidth = startWidth + dx;

    if (newWidth < 250) newWidth = 250;
    if (newWidth > 600) newWidth = 600;
    
    setLeftPanelWidth(newWidth);
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const openModal = (content: any) => {
    setModalStack([...modalStack(), content]);
  };

  const closeModal = () => {
    setModalStack(modalStack().slice(0, -1));
  };

  const openImageModal = (imageUrl: string) => openModal({ type: 'image', url: imageUrl });

  const openVideoModal = (videoUrl: string, videoId: string, keyframeId: string) => {
    setModalVideoId(videoId);
    setModalKeyframeId(keyframeId);
    setModalNote('');
    openModal({ type: 'video', url: videoUrl, videoId: videoId });
  };
  
  const openKeyframeModal = (videoId: string) => { 
    setModalVideoId('');
    setModalKeyframeId('');
    setModalNote('');
    openModal({ type: 'keyframes', videoId: videoId }); 
  };

  const handleSearch = async () => {
    setIsLoading(true);
    const filteredQueries = queries.map(q => q.text).filter(q => q.trim() !== '');
    if (filteredQueries.length === 0) {
      setResults([]);
      setTemporalResults([]);
      setIsLoading(false);
      return;
    }

    const isTemporal = filteredQueries.length > 1;
    setIsTemporalResult(isTemporal);

    try {
      const payload = {
        queries: filteredQueries,
        retriever: retriever(),
        filters: { keyword: keywordFilter(), object: objectFilter() },
        top_k_per_query: topKPerQuery()
      };
      const response = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Search request failed');
      const data = await response.json();

      if (isTemporal) {
        const processedTemporal: TemporalQueryResult[] = data.results.map((videoResult: any) => ({
          ...videoResult,
          video_url: `${API_BASE_URL}/static/video/${videoResult.video_id}.mp4`,
          query_results: videoResult.query_results.map((qr: any) => ({
            ...qr,
            keyframes: qr.keyframes.map((kf: any) => ({
              ...kf,
              image_url: `${API_BASE_URL}/static/keyframes/${videoResult.video_id}/${kf.keyframe_id}.jpg`,
            }))
          }))
        }));
        setTemporalResults(processedTemporal);
        setResults([]);
      } else {
        const processedResults: SearchResultItem[] = data.results.map((item: { video_id: string; keyframe_id: string; keyframe_index: number; }) => ({
          video_id: item.video_id,
          keyframe_id: item.keyframe_id,
          keyframe_index: item.keyframe_index,
          image_url: `${API_BASE_URL}/static/keyframes/${item.video_id}/${item.keyframe_id}.jpg`,
          // This is the NEW, CORRECT line
          video_url: `${API_BASE_URL}/api/video/${item.video_id}`,
        }));
        setResults(processedResults || []);
        setTemporalResults([]);
      }
    } catch (error) {
      console.error("Failed to perform search:", error);
      setResults([]);
      setTemporalResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const populateIdFields = (newVideoId: string, newKeyframeIndex: string) => {
    if (isTemporalMode() && newVideoId === displayVideoId()) {
      const currentKeyframes = displayKeyframeId().split(',').filter(Boolean);
      const newKeyframeSet = new Set(currentKeyframes);
      newKeyframeSet.add(newKeyframeIndex);
      const sortedKeyframes = Array.from(newKeyframeSet).map(Number).sort((a, b) => a - b);
      setDisplayKeyframeId(sortedKeyframes.join(','));
    } else {
      setDisplayVideoId(newVideoId);
      setDisplayKeyframeId(newKeyframeIndex);
    }
  };

  const handleAddToSubmission = () => {
    const videoId = displayVideoId();
    const keyframeIds = displayKeyframeId();
    const note = keyframeNote();
    if (videoId && keyframeIds) {
      let newLine = `${videoId},${keyframeIds}`;
      if (note) { newLine += `,"${note}"` };
      const existingLines = new Set(submissionContent().split('\n').filter(Boolean));
      if (!existingLines.has(newLine)) {
        setSubmissionContent(prevContent => prevContent ? `${prevContent}\n${newLine}` : newLine);
      }
      setDisplayVideoId(''); setDisplayKeyframeId(''); setKeyframeNote('');
    } else {
      alert("Please populate IDs from a result card first.");
    }
  };

  const handleDirectAddToSubmission = (videoId: string, keyframeIndex: number) => {
    const newLine = `${videoId},${keyframeIndex}`;
    const existingLines = new Set(submissionContent().split('\n').filter(Boolean));
    if (!existingLines.has(newLine)) {
      setSubmissionContent(prevContent => prevContent ? `${prevContent}\n${newLine}` : newLine);
    }
  };

  const handleModalPopulate = (videoId: string, keyframeId: string) => {
    if (isTemporalMode() && videoId === modalVideoId()) {
      const currentKeyframes = modalKeyframeId().split(',').filter(Boolean);
      const newKeyframeSet = new Set(currentKeyframes);
      newKeyframeSet.add(keyframeId);
      const sortedKeyframes = Array.from(newKeyframeSet).map(Number).sort((a, b) => a - b);
      setModalKeyframeId(sortedKeyframes.join(','));
    } else {
      setModalVideoId(videoId);
      setModalKeyframeId(keyframeId);
    }
  };

  const handleModalAddToSubmission = () => {
    const videoId = modalVideoId();
    const keyframeId = modalKeyframeId();
    const note = modalNote();
    if (videoId && keyframeId) {
        let newLine = `${videoId},${keyframeId}`;
        if (note) { newLine += `,"${note}"` };
        const existingLines = new Set(submissionContent().split('\n').filter(Boolean));
        if (!existingLines.has(newLine)) {
            setSubmissionContent(prevContent => prevContent ? `${prevContent}\n${newLine}` : newLine);
        }
        setModalVideoId('');
        setModalKeyframeId('');
        setModalNote('');
    } else {
        alert("Please populate IDs first.");
    }
  };

  const handleDownloadCsv = () => {
    if (!submissionContent()) {
      alert("Submission content is empty.");
      return;
    }
    const filename = submissionFilename() || "submission";
    const blob = new Blob([submissionContent()], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentModal = () => modalStack().length > 0 ? modalStack()[modalStack().length - 1] : null;

  const modalSize = () => {
    const type = currentModal()?.type;
    if (type === 'keyframes') return 'extra-large';
    if (type === 'video') return 'large';
    return 'large';
  };

  const modalFooter = (
    <div class="flex items-center space-x-3 w-full">
      <label class="text-sm font-medium">Video ID:</label>
      <input type="text" readOnly class="p-1 border rounded text-sm w-32 bg-gray-100" value={modalVideoId()} />
      <label class="text-sm font-medium">Keyframe ID:</label>
      <input type="text" readOnly class="p-1 border rounded text-sm w-24 bg-gray-100" value={modalKeyframeId()} />
      <button
        class="px-3 py-1 text-white text-sm rounded transition-colors"
        classList={{
          'bg-gray-500 hover:bg-gray-600': !isTemporalMode(),
          'bg-teal-500 hover:bg-teal-600': isTemporalMode(),
        }}
        onClick={() => setIsTemporalMode(!isTemporalMode())}
        title={isTemporalMode() ? 'Temporal Mode ON (Append)' : 'Temporal Mode OFF (Replace)'}
      >
        {isTemporalMode() ? '⏰' : '🔄'}
      </button>
      <label class="text-sm font-medium">Note:</label>
      <input 
        type="text" 
        class="p-1 border rounded text-sm flex-grow"
        placeholder="Add a note..."
        value={modalNote()}
        onInput={(e) => setModalNote(e.currentTarget.value)}
      />
      <button 
        class="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        onClick={handleModalAddToSubmission}
        disabled={!modalVideoId() || !modalKeyframeId()}
        title="Add to List"
      >
        ➕
      </button>
    </div>
  );

  return (
    <div class="flex h-screen bg-gray-50 select-none">
      <div 
        class="flex-shrink-0 bg-white border-r border-gray-200 relative"
        style={{ width: `${leftPanelWidth()}px` }}
      >
        <LeftPanel 
          queries={queries}
          onAddQuery={addQuery}
          onRemoveQuery={removeQuery}
          onUpdateQuery={updateQuery}
          retriever={retriever}
          setRetriever={setRetriever}
          topKPerQuery={topKPerQuery}
          setTopKPerQuery={setTopKPerQuery}
          keywordFilter={keywordFilter}
          setKeywordFilter={setKeywordFilter}
          objectFilter={objectFilter}
          setObjectFilter={setObjectFilter}
          onSearch={handleSearch}
          isLoading={isLoading}
          submissionFilename={submissionFilename}
          setSubmissionFilename={setSubmissionFilename}
          submissionContent={submissionContent}
          setSubmissionContent={setSubmissionContent}
          onDownloadCsv={handleDownloadCsv}
        />
      </div>
      <div 
        class="w-1.5 cursor-col-resize bg-gray-200 hover:bg-gray-300 transition-colors"
        onMouseDown={handleMouseDown}
      ></div>
      <main class="flex-1 flex flex-col">
        <TopPanel 
            {...{ 
                videoId: displayVideoId, setVideoId: setDisplayVideoId, 
                keyframeId: displayKeyframeId, setKeyframeId: setDisplayKeyframeId, 
                keyframeNote, setKeyframeNote, 
                onAddToSubmission: handleAddToSubmission, 
                onGroup: () => setGroupByVideo(!groupByVideo()), 
                onGridChange: setGridCols,
                isTemporalMode, setIsTemporalMode
            }} 
        />
        <div class="flex-1 overflow-y-auto p-4">
          <RightPanel 
            images={results} 
            temporalResults={temporalResults}
            isTemporalResult={isTemporalResult}
            isLoading={isLoading} 
            onVideoView={openVideoModal} 
            onKeyframeView={openKeyframeModal} 
            onPopulateIdFields={populateIdFields}
            onDirectAddToSubmission={handleDirectAddToSubmission}
            onImageZoom={openImageModal}
            gridCols={gridCols}
            groupByVideo={groupByVideo}
          />
        </div>
      </main>
      <Show when={currentModal()}>
        <Modal 
          isOpen={true} 
          onClose={closeModal}
          size={modalSize()}
          footer={(currentModal()?.type === 'keyframes' || currentModal()?.type === 'video') && modalFooter}
        >
          <Show when={currentModal()?.type === 'video'}><VideoModal
              videoUrl={currentModal().url}
              videoId={currentModal().videoId}
              onSelectFrame={(frameIndex) => handleModalPopulate(currentModal().videoId, frameIndex.toString())}
            />
          </Show>
          <Show when={currentModal()?.type === 'keyframes'}><KeyframeModal videoId={currentModal().videoId} handlers={{ onImageZoom: openImageModal, onDirectAddToSubmission: handleDirectAddToSubmission, onModalPopulate: handleModalPopulate }} /></Show>
          <Show when={currentModal()?.type === 'image'}><ImageModal imageUrl={currentModal().url} /></Show>
        </Modal>
      </Show>
    </div>
  );
};
export default App;




