import { Component, createSignal, Show} from 'solid-js';
import { createStore } from 'solid-js/store';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Modal from './components/Modal';
import VideoModal from './components/VideoModal';
import KeyframeModal from './components/KeyframeModal';
import TopPanel from './components/TopPanel';
import ImageModal from './components/ImageModal';

export interface SearchResultItem {
  video: string;
  frame: string;
  frame_index: number;
  image_url: string;
  video_url: string;
}

export interface TemporalQueryResult {
  video: string;
  video_url: string;
  query_results: {
    query: string;
    keyframes: {
      frame: string;
      frame_index: number;
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
  const [topKPerQuery, setTopKPerQuery] = createSignal(10);
  const [totalResults, setTotalResults] = createSignal(100);
  const [keywordFilter, setKeywordFilter] = createSignal('');
  const [vietnameseQuery, setVietnameseQuery] = createSignal('');
  const [selectedObjects, setSelectedObjects] = createSignal<string[]>([]);
  const [selectedPacks, setSelectedPacks] = createSignal<string[]>([]);
  const [selectedVideos, setSelectedVideos] = createSignal<string[]>([]);
  const [excludedVideos, setExcludedVideos] = createSignal<string[]>([]);
  const [results, setResults] = createSignal<SearchResultItem[]>([]);
  const [temporalResults, setTemporalResults] = createSignal<TemporalQueryResult[]>([]);
  const [isTemporalResult, setIsTemporalResult] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
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

  const [imageModalUrl, setImageModalUrl] = createSignal<string | null>(null);
  const [videoModalProps, setVideoModalProps] = createSignal<any | null>(null);
  const [keyframeModalProps, setKeyframeModalProps] = createSignal<any | null>(null);

  const API_BASE_URL = "";
  const KEYFRAME_BASE_URL = "https://huggingface.co/datasets/ChungDat/hcm-aic2025-keyframes/resolve/main";

  const addQuery = () => setQueries(queries.length, { id: queryIdCounter++, text: '' });
  const removeQuery = (id: number) => setQueries(q => q.filter(item => item.id !== id));
  const updateQuery = (id: number, text: string) => setQueries(q => q.id === id, 'text', text);

  const handleExcludeVideo = (video: string) => {
    if (!excludedVideos().includes(video)) {
      setExcludedVideos([...excludedVideos(), video]);
    }
  };

  

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

  const openImageModal = (imageUrl: string) => setImageModalUrl(imageUrl);
  const closeImageModal = () => setImageModalUrl(null);

  const openVideoModal = async (video: string, frame_index: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/video_details/${video}`);
      if (!response.ok) throw new Error('Failed to fetch video details');
      const data = await response.json();
      
      setModalVideoId(video);
      setModalKeyframeId(frame_index.toString());
      setModalNote('');
      setVideoModalProps({
        watchUrl: data.watch_url, 
        fps: data.fps,
        videoId: video, 
        keyframeIndex: frame_index 
      });
    } catch (error) {
      console.error("Error opening video modal:", error);
      alert("Could not load video. See console for details.");
    }
  };
  const closeVideoModal = () => setVideoModalProps(null);
  
  const openKeyframeModal = (video: string) => { 
    setModalVideoId(video);
    setModalKeyframeId('');
    setModalNote('');
    setKeyframeModalProps({ videoId: video }); 
  };
  const closeKeyframeModal = () => setKeyframeModalProps(null);

  const handleSearch = async () => {
    setIsLoading(true);
    const filteredQueries = queries.map(q => q.text).filter(q => q.trim() !== '');
    
    const hasFilters = keywordFilter() || selectedObjects().length > 0 || selectedPacks().length > 0 || selectedVideos().length > 0 || vietnameseQuery();

    if (filteredQueries.length === 0 && !hasFilters) {
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
        retriever: 'clip',
        filters: { 
          keyword: keywordFilter(), 
          object: selectedObjects().join(','), 
          packs: selectedPacks(),
          videos: selectedVideos(),
          excluded_videos: excludedVideos(),
          vietnamese_query: vietnameseQuery()
        },
        top_k_per_query: topKPerQuery(),
        top_k: totalResults(),
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
          video_url: `${API_BASE_URL}/api/video/${videoResult.video}`,
          query_results: videoResult.query_results.map((qr: any) => ({
            ...qr,
            keyframes: qr.keyframes.map((kf: any) => ({
              ...kf,
              image_url: `${KEYFRAME_BASE_URL}/${videoResult.video}/${kf.frame}?download=true`,
            }))
          }))
        }));
        setTemporalResults(processedTemporal);
        setResults([]);
      } else {
        const processedResults: SearchResultItem[] = data.results.map((item: { video: string; frame: string; frame_index: number; }) => ({
          video: item.video,
          frame: item.frame,
          frame_index: item.frame_index,
          image_url: `${KEYFRAME_BASE_URL}/${item.video}/${item.frame}?download=true`,
          video_url: `${API_BASE_URL}/api/video/${item.video}`,
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

  const populateIdFields = (video: string, frame_index: string) => {
    if (isTemporalMode() && video === displayVideoId()) {
      const currentKeyframes = displayKeyframeId().split(',').filter(Boolean);
      const newKeyframeSet = new Set(currentKeyframes);
      newKeyframeSet.add(frame_index);
      const sortedKeyframes = Array.from(newKeyframeSet).map(Number).sort((a, b) => a - b);
      setDisplayKeyframeId(sortedKeyframes.join(','));
    } else {
      setDisplayVideoId(video);
      setDisplayKeyframeId(frame_index);
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

  const handleDirectAddToSubmission = (video: string, frame_index: number) => {
    const newLine = `${video},${frame_index}`;
    const existingLines = new Set(submissionContent().split('\n').filter(Boolean));
    if (!existingLines.has(newLine)) {
      setSubmissionContent(prevContent => prevContent ? `${prevContent}\n${newLine}` : newLine);
    }
  };

  const handleModalPopulate = (video: string, frame: string) => {
    if (isTemporalMode() && video === modalVideoId()) {
      const currentKeyframes = modalKeyframeId().split(',').filter(Boolean);
      const newKeyframeSet = new Set(currentKeyframes);
      newKeyframeSet.add(frame);
      const sortedKeyframes = Array.from(newKeyframeSet).map(Number).sort((a, b) => a - b);
      setModalKeyframeId(sortedKeyframes.join(','));
    } else {
      setModalVideoId(video);
      setModalKeyframeId(frame);
    }
  };

  const populateFromModal = (video: string, frame_index: string) => {
    populateIdFields(video, frame_index); 
    handleModalPopulate(video, frame_index);
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

  const handleSaveCsvToServer = async () => {
    if (!submissionContent()) {
      alert("Submission content is empty.");
      return;
    }
    const filename = submissionFilename() || "submission";
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/save_submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filename, content: submissionContent() }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Submission saved successfully on the server at: ${result.path}`);
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.detail || 'Failed to save submission');
      }
    } catch (error) {
      console.error("Error saving submission:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const modalFooter = (
    <div class="flex items-center space-x-3 w-full">
      <label class="text-sm font-medium">Video ID:</label>
      <input type="text" class="p-1 border rounded text-sm w-32" value={modalVideoId()} onInput={(e) => setModalVideoId(e.currentTarget.value)} />
      <label class="text-sm font-medium">Keyframe ID:</label>
      <input type="text" class="p-1 border rounded text-sm w-24" value={modalKeyframeId()} onInput={(e) => setModalKeyframeId(e.currentTarget.value)} />
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
      <label class="text-sm font-medium">Answer:</label>
      <input 
        type="text" 
        class="p-1 border rounded text-sm flex-grow"
        placeholder="Add answer..."
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
          topKPerQuery={topKPerQuery}
          setTopKPerQuery={setTopKPerQuery}
          keywordFilter={keywordFilter}
          setKeywordFilter={setKeywordFilter}
          vietnameseQuery={vietnameseQuery}
          setVietnameseQuery={setVietnameseQuery}
          selectedObjects={selectedObjects}
          setSelectedObjects={setSelectedObjects}
          selectedPacks={selectedPacks}
          setSelectedPacks={setSelectedPacks}
          selectedVideos={selectedVideos}
          setSelectedVideos={setSelectedVideos}
          excludedVideos={excludedVideos}
          setExcludedVideos={setExcludedVideos}
          onSearch={handleSearch}
          isLoading={isLoading}
          submissionFilename={submissionFilename}
          setSubmissionFilename={setSubmissionFilename}
          submissionContent={submissionContent}
          setSubmissionContent={setSubmissionContent}
          onSaveCsv={handleSaveCsvToServer}
          API_BASE_URL={API_BASE_URL}
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
                isTemporalMode, setIsTemporalMode,
                totalResults, setTotalResults
            }} 
        />
        <div class="flex-1 overflow-y-auto p-4">
          <RightPanel 
            images={results}
            temporalResults={temporalResults}
            excludedVideos={excludedVideos}
            isTemporalResult={isTemporalResult}
            isLoading={isLoading} 
            onVideoView={(_videoUrl, video, _frame, frame_index) => openVideoModal(video, frame_index)} 
            onKeyframeView={openKeyframeModal} 
            onPopulateIdFields={populateIdFields}
            onDirectAddToSubmission={handleDirectAddToSubmission}
            onImageZoom={openImageModal}
            onExcludeVideo={handleExcludeVideo}
            gridCols={gridCols}
            groupByVideo={groupByVideo}
          />
        </div>
      </main>

      <Show when={keyframeModalProps()}>
        <Modal 
          isOpen={true} 
          onClose={closeKeyframeModal}
          size="extra-large"
          footer={modalFooter}
        >
          <KeyframeModal 
            video={keyframeModalProps().videoId} 
            handlers={{ 
              onImageZoom: openImageModal, 
              onDirectAddToSubmission: handleDirectAddToSubmission, 
              onPopulateIdFields: populateFromModal 
            }} 
          />
        </Modal>
      </Show>

      <Show when={videoModalProps()}>
        <Modal 
          isOpen={true} 
          onClose={closeVideoModal}
          size="large"
          footer={modalFooter}
        >
          <VideoModal
            watchUrl={videoModalProps().watchUrl}
            fps={videoModalProps().fps}
            videoId={videoModalProps().videoId}
            keyframeIndex={videoModalProps().keyframeIndex}
            onSelectFrame={(frameIndex) => handleModalPopulate(videoModalProps().videoId, frameIndex.toString())}
          />
        </Modal>
      </Show>

      <Show when={imageModalUrl()}>
        <Modal isOpen={true} onClose={closeImageModal} size="large">
          <ImageModal imageUrl={imageModalUrl()!} />
        </Modal>
      </Show>
    </div>
  );
};
export default App;




