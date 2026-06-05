import Competitions from './pages/Competitions'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MotionsRepo from './pages/Motions'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Dashboard from './pages/Dashboard'
import Welcome from './pages/archive/Welcome'
import TeamTab from './pages/archive/TeamTab'
import SpeakerTab from './pages/archive/SpeakerTab'
import RepliesTab from './pages/archive/RepliesTab'
import Motions from './pages/archive/Motions'
import Results from './pages/archive/Results'
import Break from './pages/archive/Break'
import Participants from './pages/archive/Participants'
import Folders from './pages/Folders'
import SharedFolder from './pages/SharedFolder'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* TabVault public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/competitions" element={<Competitions />} />


        {/* Archive — tournament replica */}
        <Route path="/archive/:slug" element={<Welcome />} />
        <Route path="/archive/:slug/tab/team" element={<TeamTab />} />
        <Route path="/archive/:slug/tab/team/:category" element={<TeamTab />} />
        <Route path="/archive/:slug/tab/speaker" element={<SpeakerTab />} />
        <Route path="/archive/:slug/tab/speaker/:category" element={<SpeakerTab />} />
        <Route path="/archive/:slug/tab/replies" element={<RepliesTab />} />
        <Route path="/archive/:slug/motions" element={<Motions />} />
        <Route path="/archive/:slug/results/round/:seq" element={<Results />} />
        <Route path="/archive/:slug/break/:category" element={<Break />} />
        <Route path="/archive/:slug/participants" element={<Participants />} />
        <Route path="/folders" element={<Folders />} />
        <Route path="/motions" element={<MotionsRepo />} />
        <Route path="/folders/shared/:token" element={<SharedFolder />} />
      </Routes>
    </BrowserRouter>
  )
}
