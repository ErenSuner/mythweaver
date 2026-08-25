import type { ComponentType } from 'react'
import type { Character } from '@/types/character'
import { raceComplete, classComplete, abilitiesComplete, skillsComplete, equipmentComplete, choicesComplete, spellsComplete } from '@/lib/validation'
import StepWelcome from './StepWelcome'
import StepRace from './StepRace'
import StepClass from './StepClass'
import StepStartingLevel from './StepStartingLevel'
import StepAbilities from './StepAbilities'
import StepBackground from './StepBackground'
import StepSkills from './StepSkills'
import StepEquipment from './StepEquipment'
import StepLanguages from './StepLanguages'
import StepSpells from './StepSpells'
import StepIdentity from './StepIdentity'
import StepLevels from './StepLevels'
import StepStory from './StepStory'
import StepSummary from './StepSummary'

export interface WizardStep {
  key: string
  title: string
  subtitle?: string
  component: ComponentType
  canProceed?: (c: Character) => boolean
}

export const WIZARD_STEPS: WizardStep[] = [
  { key: 'welcome', title: 'Hoş Geldin, Efsane Dokuyucu', subtitle: 'Yolculuğa başlamadan önce', component: StepWelcome },
  { key: 'race', title: 'İlk İpliği Seç: Irk', subtitle: 'Kahramanın nereden geliyor?', component: StepRace, canProceed: raceComplete },
  { key: 'class', title: 'Kaderini Belirle: Sınıf', subtitle: 'Nasıl bir maceracı olacak?', component: StepClass, canProceed: classComplete },
  { key: 'startingLevel', title: 'Başlangıç Seviyesi', subtitle: 'Hikâye kaçıncı seviyeden açılıyor?', component: StepStartingLevel },
  { key: 'abilities', title: 'Gücünü Dağıt: Yetenek Puanları', subtitle: 'Point Buy — 27 puan (hepsi dağıtılmalı)', component: StepAbilities, canProceed: abilitiesComplete },
  { key: 'background', title: 'Geçmişini Doku: Background', subtitle: 'Maceradan önce kimdi?', component: StepBackground, canProceed: (c) => Boolean(c.backgroundId) },
  { key: 'skills', title: 'Ustalıkların: Beceriler & Kurtarmalar', component: StepSkills, canProceed: skillsComplete },
  { key: 'equipment', title: 'Kuşan: Zırh, Silah & Ekipman', component: StepEquipment, canProceed: equipmentComplete },
  { key: 'languages', title: 'Diller & Seçmeli Kazanımlar', component: StepLanguages, canProceed: choicesComplete },
  {
    key: 'levels',
    title: 'Seviyeleri Yükselt',
    subtitle: 'Her seviyenin kazanımlarını seç',
    component: StepLevels,
    canProceed: (c) => c.level >= (c.startingLevel ?? 1),
  },
  { key: 'spells', title: 'Büyüleri Öğren', subtitle: 'Cantrip ve 1. seviye büyüler', component: StepSpells, canProceed: spellsComplete },
  { key: 'identity', title: 'Kimlik & Görünüm', component: StepIdentity },
  { key: 'story', title: 'Kişilik & Hikaye', component: StepStory },
  { key: 'summary', title: 'Efsanen Tamamlandı', subtitle: 'Karakter kartını gözden geçir', component: StepSummary },
]
