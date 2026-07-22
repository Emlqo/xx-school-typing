import { useState } from 'react';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import AnnouncementManagementPanel from '../teacher/AnnouncementManagementPanel.jsx';
import ClassManagementPanel from '../teacher/ClassManagementPanel.jsx';
import HallOfFamePanel from '../teacher/HallOfFamePanel.jsx';
import LeaderboardPanel from '../teacher/LeaderboardPanel.jsx';
import QuizManagementPanel from '../teacher/QuizManagementPanel.jsx';
import RoomManagementPanel from '../teacher/RoomManagementPanel.jsx';
import ShopPointManagementPanel from '../teacher/ShopPointManagementPanel.jsx';
import StudentRosterPanel from '../teacher/StudentRosterPanel.jsx';
import TeacherHeader from '../teacher/TeacherHeader.jsx';
import TeacherDuelHistoryPanel from '../teacher/TeacherDuelHistoryPanel.jsx';
import TeacherDuelLivePanel from '../teacher/TeacherDuelLivePanel.jsx';
import WordManagementPanel from '../teacher/WordManagementPanel.jsx';

export default function TeacherDashboardView({
  getLeaderboard = () => [],
  currentTime = Date.now(),
  onLogout = () => {},
  handleCreateRoom = () => {},
  newRoomName = '',
  setNewRoomName = () => {},
  roomMode = 'ko',
  setRoomMode = () => {},
  roomDuration = '300',
  setRoomDuration = () => {},
  rooms = [],
  viewingRoomId = '',
  setViewingRoomId = () => {},
  handleDeleteRoom = () => {},
  startRoomGame = () => {},
  requestScoreSync = () => {},
  finalizeRankRewards = () => {},
  toggleBoosterPower = () => {},
  toggleWeight = () => {},
  toggleDifficulty = () => {},
  handleSaveAnnouncement = () => {},
  annTitle = '',
  setAnnTitle = () => {},
  annContent = '',
  setAnnContent = () => {},
  annIsAlert = false,
  setAnnIsAlert = () => {},
  editingAnnId = null,
  announcements = [],
  editAnnouncement = () => {},
  handleDeleteAnnouncement = () => {},
  cancelEditAnnouncement = () => {},
  handleSaveQuiz = () => {},
  quizQuestion = '',
  setQuizQuestion = () => {},
  quizOptions = ['', '', '', ''],
  setQuizOptions = () => {},
  quizAnswer = 0,
  setQuizAnswer = () => {},
  quizzes = [],
  handleDeleteQuiz = () => {},
  wordText = '',
  setWordText = () => {},
  wordLanguage = 'ko',
  setWordLanguage = () => {},
  words = [],
  handleSaveWord = () => {},
  handleDeleteWord = () => {},
  classes = [],
  selectedClassId = '',
  setSelectedClassId = () => {},
  classGrade = '1',
  setClassGrade = () => {},
  classNumber = '1',
  setClassNumber = () => {},
  classRoomMode = 'ko',
  setClassRoomMode = () => {},
  classRoomDuration = '300',
  setClassRoomDuration = () => {},
  handleCreateClass = () => {},
  handleDeleteClass = () => {},
  openClassRoom = () => {},
  deleteClassRoomSession = () => {},
  students = [],
  studentBulkText = '',
  setStudentBulkText = () => {},
  handleBulkAddStudents = () => {},
  handleDeleteStudent = () => {},
  handleRegenerateStudentPin = () => {},
  handleResetStudentPin = () => {},
  handleSyncPublicRoster = () => {},
  handleSetStudentPoints = () => {},
  handleAdjustStudentPoints = () => {},
  handleGrantStudentCosmetic = () => {},
  handleRemoveStudentCosmetic = () => {},
  handleResetStudentCosmetics = () => {},
  shopItems = [],
  shopPurchases = [],
  handleSaveShopItem = () => {},
  handleDeleteShopItem = () => {},
  classEntryCount = 0,
  hallOfFameMonthKey = '',
  setHallOfFameMonthKey = () => {},
  hallOfFame = {},
  monthlyScores = [],
  hallOfFameScoreCount = 0,
  hallOfFameSavedAt = null,
  refreshHallOfFame = () => {},
  isHallOfFameLoading = false,
  hallOfFameError = null,
  duelHistoryRecords = [],
  duelHistoryLoading = false,
  duelHistoryHasMore = false,
  duelHistoryError = '',
  openDuelHistory = () => {},
  loadMoreDuelHistory = () => {},
  refreshDuelHistory = () => {},
  liveDuels = [],
  selectedLiveDuelId = '',
  setSelectedLiveDuelId = () => {},
  selectedLiveDuel = null,
  selectedLiveScores = [],
  liveDuelsLoading = false,
  liveDuelsError = null,
  liveDuelDetailError = null,
  onLiveSectionChange = () => {},
}) {
  const [activeSection, setActiveSection] = useState('overview');

  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return 0;
  };

  const leaderboardScores = getLeaderboard();
  const roomTotalScore = leaderboardScores.reduce((sum, score) => sum + (score.score || 0), 0);
  const participantCount = leaderboardScores.length;
  const roomAverageScore = participantCount > 0 ? Math.floor(roomTotalScore / participantCount) : 0;
  const selectedClass = classes.find((classItem) => classItem.id === selectedClassId) || null;
  const scoreboardClassRooms = rooms
    .filter((room) => room.entryType === 'class' && room.classId === selectedClassId)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const guestRooms = rooms
    .filter((room) => room.entryType !== 'class')
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const selectedClassRooms = rooms.filter((room) => {
    if (room.entryType !== 'class' || room.classId !== selectedClassId) return false;
    if (room.status === 'waiting') return true;
    if (room.status !== 'playing') return false;
    const expiresAt = toMillis(room.expiresAt);
    return !expiresAt || expiresAt > currentTime;
  });
  const selectedClassRoom = selectedClassRooms.find((room) => room.id === viewingRoomId) || null;
  const selectedClassRoomScores = selectedClassRoom ? leaderboardScores : [];
  const selectedClassEntryCount = new Set(
    selectedClassRoomScores
      .filter((score) => score.studentId)
      .map((score) => score.studentId),
  ).size;
  const selectSection = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId === 'duels') openDuelHistory();
    onLiveSectionChange(sectionId === 'duelLive');
  };

  return (
    <div className="min-h-screen spring-bg p-4 md:p-8">
      <CherryBlossomBackground />
      <div className="max-w-6xl mx-auto space-y-6 z-10 relative">
        <TeacherHeader
          onLogout={onLogout}
          activeSection={activeSection}
          setActiveSection={selectSection}
        />

        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RoomManagementPanel
              handleCreateRoom={handleCreateRoom}
              newRoomName={newRoomName}
              setNewRoomName={setNewRoomName}
              roomMode={roomMode}
              setRoomMode={setRoomMode}
              roomDuration={roomDuration}
              setRoomDuration={setRoomDuration}
              classes={classes}
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
              classRooms={scoreboardClassRooms}
              guestRooms={guestRooms}
              currentTime={currentTime}
              viewingRoomId={viewingRoomId}
              setViewingRoomId={setViewingRoomId}
              handleDeleteRoom={handleDeleteRoom}
            />
            <LeaderboardPanel
              leaderboardScores={leaderboardScores}
              students={selectedClassRoom ? students : []}
              rooms={rooms}
              viewingRoomId={viewingRoomId}
              participantCount={participantCount}
              roomAverageScore={roomAverageScore}
              currentTime={currentTime}
              startRoomGame={startRoomGame}
              requestScoreSync={requestScoreSync}
              finalizeRankRewards={finalizeRankRewards}
              toggleBoosterPower={toggleBoosterPower}
              toggleWeight={toggleWeight}
              toggleDifficulty={toggleDifficulty}
            />
          </div>
        )}

        {activeSection === 'classes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClassManagementPanel
              classes={classes}
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
              classGrade={classGrade}
              setClassGrade={setClassGrade}
              classNumber={classNumber}
              setClassNumber={setClassNumber}
              classRoomMode={classRoomMode}
              setClassRoomMode={setClassRoomMode}
              classRoomDuration={classRoomDuration}
              setClassRoomDuration={setClassRoomDuration}
              handleCreateClass={handleCreateClass}
              handleDeleteClass={handleDeleteClass}
              openClassRoom={openClassRoom}
              classRooms={selectedClassRooms}
              selectedClassRoomId={viewingRoomId}
              selectClassRoomSession={setViewingRoomId}
              deleteClassRoomSession={deleteClassRoomSession}
              classEntryCount={selectedClassEntryCount || classEntryCount}
            />
            <StudentRosterPanel
              selectedClass={selectedClass}
              selectedClassRoom={selectedClassRoom}
              students={students}
              classRoomScores={selectedClassRoomScores}
              studentBulkText={studentBulkText}
              setStudentBulkText={setStudentBulkText}
              handleBulkAddStudents={handleBulkAddStudents}
              handleDeleteStudent={handleDeleteStudent}
              handleRegenerateStudentPin={handleRegenerateStudentPin}
              handleResetStudentPin={handleResetStudentPin}
              handleSyncPublicRoster={handleSyncPublicRoster}
            />
          </div>
        )}

        {activeSection === 'records' && (
          <>
            <HallOfFamePanel
              monthKey={hallOfFameMonthKey}
              setMonthKey={setHallOfFameMonthKey}
              hallOfFame={hallOfFame}
              monthlyScores={monthlyScores}
              scoreCount={hallOfFameScoreCount}
              savedAt={hallOfFameSavedAt}
              onRefresh={refreshHallOfFame}
              isLoading={isHallOfFameLoading}
              error={hallOfFameError}
            />

            <AnnouncementManagementPanel
              handleSaveAnnouncement={handleSaveAnnouncement}
              annTitle={annTitle}
              setAnnTitle={setAnnTitle}
              annContent={annContent}
              setAnnContent={setAnnContent}
              annIsAlert={annIsAlert}
              setAnnIsAlert={setAnnIsAlert}
              editingAnnId={editingAnnId}
              announcements={announcements}
              editAnnouncement={editAnnouncement}
              handleDeleteAnnouncement={handleDeleteAnnouncement}
              cancelEditAnnouncement={cancelEditAnnouncement}
            />
          </>
        )}

        {activeSection === 'shop' && (
          <ShopPointManagementPanel
            classes={classes}
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            students={students}
            shopPurchases={shopPurchases}
            handleSetStudentPoints={handleSetStudentPoints}
            handleAdjustStudentPoints={handleAdjustStudentPoints}
            handleGrantStudentCosmetic={handleGrantStudentCosmetic}
            handleRemoveStudentCosmetic={handleRemoveStudentCosmetic}
            handleResetStudentCosmetics={handleResetStudentCosmetics}
            shopItems={shopItems}
            handleSaveShopItem={handleSaveShopItem}
            handleDeleteShopItem={handleDeleteShopItem}
          />
        )}

        {activeSection === 'quizzes' && (
          <QuizManagementPanel
            handleSaveQuiz={handleSaveQuiz}
            quizQuestion={quizQuestion}
            setQuizQuestion={setQuizQuestion}
            quizOptions={quizOptions}
            setQuizOptions={setQuizOptions}
            quizAnswer={quizAnswer}
            setQuizAnswer={setQuizAnswer}
            quizzes={quizzes}
            handleDeleteQuiz={handleDeleteQuiz}
          />
        )}

        {activeSection === 'words' && (
          <WordManagementPanel
            wordText={wordText}
            setWordText={setWordText}
            wordLanguage={wordLanguage}
            setWordLanguage={setWordLanguage}
            words={words}
            handleSaveWord={handleSaveWord}
            handleDeleteWord={handleDeleteWord}
          />
        )}

        {activeSection === 'duels' && (
          <TeacherDuelHistoryPanel
            records={duelHistoryRecords}
            isLoading={duelHistoryLoading}
            hasMore={duelHistoryHasMore}
            error={duelHistoryError}
            onLoadMore={loadMoreDuelHistory}
            onRefresh={refreshDuelHistory}
          />
        )}

        {activeSection === 'duelLive' && (
          <TeacherDuelLivePanel
            duels={liveDuels}
            selectedDuelId={selectedLiveDuelId}
            setSelectedDuelId={setSelectedLiveDuelId}
            selectedDuel={selectedLiveDuel}
            scores={selectedLiveScores}
            currentTime={currentTime}
            isLoading={liveDuelsLoading}
            error={liveDuelsError}
            detailError={liveDuelDetailError}
          />
        )}
      </div>
    </div>
  );
}
