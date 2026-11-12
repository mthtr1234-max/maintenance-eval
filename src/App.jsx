import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Star, 
  ShieldCheck, 
  BarChart3, 
  UserCheck, 
  Wrench, 
  Sparkles,
  ChevronRight,
  RotateCcw,
  Sun,
  Moon,
  Briefcase,
  Edit3,
  Calendar,
  FileSpreadsheet,
  HeartHandshake,
  Zap,
  Target,
  Shield,
  Plus,
  Trash2,
  X,
  ListTodo
} from 'lucide-react';

// --- EVALUATION METRICS DEFINITION ---
const EVAL_METRICS = [
  { key: 'responsibility', label: '1. ความรับผิดชอบ', icon: Target },
  { key: 'diligence', label: '2. ความขยันและกระตือรือร้น', icon: Zap },
  { key: 'competency', label: '3. ความสามารถในการทำงาน', icon: Wrench },
  { key: 'teamwork', label: '4. การทำงานเป็นทีม', icon: Users },
  { key: 'helpfulness', label: '5. การช่วยเหลือผู้อื่น', icon: HeartHandshake },
  { key: 'safety', label: '6. ความปลอดภัยในการทำงาน', icon: Shield }
];

// --- INITIAL MOCK DATA (FALLBACK) ---
const INITIAL_EMPLOYEES = [
  { id: '691112', name: 'นายสมชาย สายไฟ', position: 'ช่างไฟฟ้าอาวุธหนัก' },
  { id: '691113', name: 'นายวิชัย เครื่องกล', position: 'ช่างซ่อมบำรุงเครื่องจักร' },
  { id: '691114', name: 'นายอนันต์ ไฮดรอลิก', position: 'ช่างระบบไฮดรอลิก' },
  { id: '691115', name: 'นายเดชา เชื่อมเหล็ก', position: 'ช่างโครงสร้างและงานเชื่อม' },
  { id: '691116', name: 'นายปรีชา ตรวจเช็ก', position: 'ช่างซ่อมบำรุงเชิงป้องกัน (PM)' },
  { id: '691117', name: 'นายสุรชัย ไอทีแมนท์', position: 'ช่างระบบคุมเครื่อง PLC/Automation' },
  { id: '691118', name: 'นายธีระ เย็นฉ่ำ', position: 'ช่างระบบปรับอากาศและทำความเย็น' },
  { id: '691119', name: 'นายกิตติศักดิ์ อะไหล่พร้อม', position: 'ช่างสนับสนุนและคลังอะไหล่' }
];

const MASTER_TASKS = [
  { id: 'T1', name: 'ซ่อมแซมเครื่องจักร/สายพาน (Corrective)', category: 'Emergency' },
  { id: 'T2', name: 'ซ่อมบำรุงเชิงป้องกัน (Preventive PM)', category: 'PM' },
  { id: 'T3', name: 'ตรวจเช็กและแก้ไขระบบไฟฟ้า/ตู้ควบคุม', category: 'Electrical' },
  { id: 'T4', name: 'แก้ไขระบบท่อ/ไฮดรอลิก/นิวแมติกส์', category: 'Mechanical' },
  { id: 'T5', name: 'งานเชื่อม ปรับแต่งโครงสร้างอาคาร/อุปกรณ์', category: 'Facility' },
  { id: 'T6', name: 'งานสนับสนุน ล้างทำความสะอาด/จัดเก็บอะไหล่', category: 'Support' }
];

const getInitialEvaluations = () => {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'EVAL-001',
      workDate: today,
      evaluatorId: '691112',
      evaluateeId: '691113',
      shift: 'SHIFT_A',
      scores: {
        responsibility: 5,
        diligence: 4,
        competency: 5,
        teamwork: 5,
        helpfulness: 4,
        safety: 5
      },
      tasks: ['T1', 'T2'],
      customTasks: ['เปลี่ยนน้ำมันเครื่องปั๊มลมโซน B'],
      createdAt: new Date().toISOString()
    }
  ];
};

export default function App() {
  const [activeTab, setActiveTab] = useState('evaluation');
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [tasks, setTasks] = useState(MASTER_TASKS);
  
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('maint_google_sheet_url') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const [evaluations, setEvaluations] = useState(() => {
    const saved = localStorage.getItem('maint_evaluations_v3');
    return saved ? JSON.parse(saved) : getInitialEvaluations();
  });

  const [step, setStep] = useState(1);
  const [evaluatorId, setEvaluatorId] = useState('');
  const [selectedEvaluateeIds, setSelectedEvaluateeIds] = useState([]);
  const [assessmentData, setAssessmentData] = useState({});

  const [selectedWorkDate, setSelectedWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShiftOverride, setSelectedShiftOverride] = useState('AUTO');

  const [adminViewMode, setAdminViewMode] = useState('daily');
  const [selectedDailyDate, setSelectedDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateFilterStart, setDateFilterStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateFilterEnd, setDateFilterEnd] = useState(new Date().toISOString().split('T')[0]);

  const [detailModalEmployee, setDetailModalEmployee] = useState(null);

  useEffect(() => {
    localStorage.setItem('maint_evaluations_v3', JSON.stringify(evaluations));
  }, [evaluations]);

  useEffect(() => {
    if (!sheetUrl) return;
    fetchDataFromGoogleSheet();
  }, [sheetUrl]);

  const fetchDataFromGoogleSheet = async () => {
    if (!sheetUrl) return;
    setIsLoading(true);
    setSyncStatus('กำลังดึงข้อมูลจาก Google Sheets...');
    try {
      const response = await fetch(sheetUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.employees && data.employees.length > 0) setEmployees(data.employees);
      if (data.tasks && data.tasks.length > 0) setTasks(data.tasks);
      if (data.evaluations) setEvaluations(data.evaluations);
      setSyncStatus('ซิงค์ข้อมูลสำเร็จ');
    } catch (err) {
      console.warn('Google Sheet fetch error (using local fallback):', err);
      setSyncStatus('ใช้ข้อมูลสำรองในเครื่อง (เชื่อมต่อ Sheet ไม่ได้)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSheetUrl = (newUrl) => {
    const trimmed = newUrl.trim();
    setSheetUrl(trimmed);
    localStorage.setItem('maint_google_sheet_url', trimmed);
    if (trimmed) {
      fetchDataFromGoogleSheet();
    }
  };

  const calculatedShiftInfo = useMemo(() => {
    const baseDate = new Date(selectedWorkDate);
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeVal = hours + minutes / 60;

    let shift = 'NORMAL';
    if (selectedShiftOverride !== 'AUTO') {
      shift = selectedShiftOverride;
    } else {
      if (currentTimeVal >= 8.5 && currentTimeVal < 17.5) {
        shift = 'NORMAL';
      } else if (currentTimeVal >= 8.5 && currentTimeVal < 20.5) {
        shift = 'SHIFT_A';
      } else {
        shift = 'SHIFT_B';
      }
    }

    if (shift === 'SHIFT_B' && currentTimeVal >= 0 && currentTimeVal < 8.5) {
      baseDate.setDate(baseDate.getDate() - 1);
    }

    return {
      shift,
      formattedWorkDate: baseDate.toISOString().split('T')[0]
    };
  }, [selectedWorkDate, selectedShiftOverride]);

  const currentEvaluator = useMemo(() => {
    return employees.find(e => String(e.id) === String(evaluatorId));
  }, [employees, evaluatorId]);

  const allTeammatesExceptSelf = useMemo(() => {
    return employees.filter(e => String(e.id) !== String(evaluatorId));
  }, [employees, evaluatorId]);

  const todayEvaluatedMap = useMemo(() => {
    if (!evaluatorId) return {};
    const map = {};
    evaluations.forEach(item => {
      if (String(item.evaluatorId) === String(evaluatorId) && item.workDate === calculatedShiftInfo.formattedWorkDate) {
        map[item.evaluateeId] = item;
      }
    });
    return map;
  }, [evaluations, evaluatorId, calculatedShiftInfo.formattedWorkDate]);

  const handleSelectEvaluator = (id) => {
    setEvaluatorId(String(id));
    setSelectedEvaluateeIds([]);
    setAssessmentData({});
    setStep(2);
  };

  const toggleTeammateSelection = (id) => {
    const targetId = String(id);
    setSelectedEvaluateeIds(prev => {
      if (prev.includes(targetId)) {
        const next = prev.filter(item => item !== targetId);
        const nextData = { ...assessmentData };
        delete nextData[targetId];
        setAssessmentData(nextData);
        return next;
      } else {
        const existingEval = todayEvaluatedMap[targetId];
        setAssessmentData(prevData => ({
          ...prevData,
          [targetId]: existingEval ? {
            scores: { ...existingEval.scores },
            selectedTasks: [...(existingEval.tasks || [])],
            customTasks: [...(existingEval.customTasks || [])]
          } : {
            scores: { responsibility: 5, diligence: 5, competency: 5, teamwork: 5, helpfulness: 5, safety: 5 },
            selectedTasks: [],
            customTasks: []
          }
        }));
        return [...prev, targetId];
      }
    });
  };

  const handleTaskToggle = (evaluateeId, taskId) => {
    setAssessmentData(prev => {
      const current = prev[evaluateeId] || { scores: { responsibility: 5, diligence: 5, competency: 5, teamwork: 5, helpfulness: 5, safety: 5 }, selectedTasks: [], customTasks: [] };
      const selected = current.selectedTasks || [];
      const updatedTasks = selected.includes(taskId)
        ? selected.filter(t => t !== taskId)
        : [...selected, taskId];

      return {
        ...prev,
        [evaluateeId]: { ...current, selectedTasks: updatedTasks }
      };
    });
  };

  const handleAddCustomTask = (evaluateeId) => {
    setAssessmentData(prev => {
      const current = prev[evaluateeId] || { scores: { responsibility: 5, diligence: 5, competency: 5, teamwork: 5, helpfulness: 5, safety: 5 }, selectedTasks: [], customTasks: [] };
      const currentCustoms = current.customTasks || [];
      if (currentCustoms.length >= 5) return prev;

      return {
        ...prev,
        [evaluateeId]: {
          ...current,
          customTasks: [...currentCustoms, '']
        }
      };
    });
  };

  const handleCustomTaskChange = (evaluateeId, index, value) => {
    setAssessmentData(prev => {
      const current = prev[evaluateeId] || { scores: { responsibility: 5, diligence: 5, competency: 5, teamwork: 5, helpfulness: 5, safety: 5 }, selectedTasks: [], customTasks: [] };
      const updatedCustoms = [...(current.customTasks || [])];
      updatedCustoms[index] = value;

      return {
        ...prev,
        [evaluateeId]: {
          ...current,
          customTasks: updatedCustoms
        }
      };
    });
  };

  const handleRemoveCustomTask = (evaluateeId, index) => {
    setAssessmentData(prev => {
      const current = prev[evaluateeId] || { scores: { responsibility: 5, diligence: 5, competency: 5, teamwork: 5, helpfulness: 5, safety: 5 }, selectedTasks: [], customTasks: [] };
      const updatedCustoms = (current.customTasks || []).filter((_, i) => i !== index);

      return {
        ...prev,
        [evaluateeId]: {
          ...current,
          customTasks: updatedCustoms
        }
      };
    });
  };

  const handleScoreMetricChange = (evaluateeId, metricKey, score) => {
    setAssessmentData(prev => {
      const current = prev[evaluateeId] || { scores: { responsibility: 5, diligence: 5, competency: 5, teamwork: 5, helpfulness: 5, safety: 5 }, selectedTasks: [], customTasks: [] };
      return {
        ...prev,
        [evaluateeId]: {
          ...current,
          scores: {
            ...current.scores,
            [metricKey]: score
          }
        }
      };
    });
  };

  const handleSubmitEvaluations = async (e) => {
    e.preventDefault();
    if (selectedEvaluateeIds.length === 0) return;

    const filteredEvaluations = evaluations.filter(
      item => !(String(item.evaluatorId) === String(evaluatorId) && 
                item.workDate === calculatedShiftInfo.formattedWorkDate && 
                selectedEvaluateeIds.includes(String(item.evaluateeId)))
    );

    const newEntries = selectedEvaluateeIds.map(evaluateeId => {
      const data = assessmentData[evaluateeId] || {};
      const cleanCustomTasks = (data.customTasks || []).filter(t => t.trim() !== '');

      return {
        id: todayEvaluatedMap[evaluateeId]?.id || `EVAL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        workDate: calculatedShiftInfo.formattedWorkDate,
        evaluatorId: String(evaluatorId),
        evaluateeId: String(evaluateeId),
        shift: calculatedShiftInfo.shift,
        scores: data.scores,
        tasks: data.selectedTasks || [],
        customTasks: cleanCustomTasks,
        createdAt: new Date().toISOString()
      };
    });

    const updatedList = [...filteredEvaluations, ...newEntries];
    setEvaluations(updatedList);

    if (sheetUrl) {
      setSyncStatus('กำลังบันทึกลง Google Sheets...');
      try {
        await fetch(sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntries)
        });
        setSyncStatus('บันทึกลง Google Sheets เรียบร้อย');
      } catch (err) {
        console.warn('Google Sheet post error:', err);
        setSyncStatus('ส่งลง Google Sheet ไม่สำเร็จ (บันทึกในเครื่องแล้ว)');
      }
    }

    setStep(4);
  };

  const resetForm = () => {
    setEvaluatorId('');
    setSelectedEvaluateeIds([]);
    setAssessmentData({});
    setStep(1);
  };

  const getShiftBadge = (shiftKey) => {
    switch (shiftKey) {
      case 'SHIFT_A':
        return <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium"><Sun className="w-3 h-3 text-amber-400" /> กะ A (Day)</span>;
      case 'SHIFT_B':
        return <span className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium"><Moon className="w-3 h-3 text-indigo-400" /> กะ B (Night)</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-slate-700 text-slate-300 border border-slate-600 text-[11px] px-2 py-0.5 rounded-full font-medium"><Briefcase className="w-3 h-3 text-emerald-400" /> เวลาปกติ</span>;
    }
  };

  const exportToCSV = () => {
    const startDate = adminViewMode === 'daily' ? selectedDailyDate : dateFilterStart;
    const endDate = adminViewMode === 'daily' ? selectedDailyDate : dateFilterEnd;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "ID พนักงาน,ชื่อ-นามสกุล,ตำแหน่ง,จำนวนผู้ประเมิน,คะแนนเฉลี่ยรวม,1.ความรับผิดชอบ,2.ความขยัน,3.ความสามารถ,4.ทำงานเป็นทีม,5.ช่วยเหลือผู้อื่น,6.ความปลอดภัย,ภารกิจที่ทำทั้งหมด\n";

    employees.forEach(emp => {
      const empEvals = evaluations.filter(
        e => String(e.evaluateeId) === String(emp.id) && e.workDate >= startDate && e.workDate <= endDate
      );
      const count = empEvals.length;

      if (count === 0) {
        csvContent += `"${emp.id}","${emp.name}","${emp.position}",0,0,0,0,0,0,0,0,"-"\n`;
      } else {
        const sums = { responsibility: 0, diligence: 0, competency: 0, teamwork: 0, helpfulness: 0, safety: 0 };
        let grandTotal = 0;
        const allTaskNamesSet = new Set();

        empEvals.forEach(e => {
          EVAL_METRICS.forEach(m => {
            const val = e.scores?.[m.key] || 0;
            sums[m.key] += val;
            grandTotal += val;
          });

          (e.tasks || []).forEach(tId => {
            const taskObj = tasks.find(t => t.id === tId);
            if (taskObj) allTaskNamesSet.add(taskObj.name);
          });
          (e.customTasks || []).forEach(cName => {
            allTaskNamesSet.add(`[ระบุเอง] ${cName}`);
          });
        });

        const overallAvg = (grandTotal / (count * EVAL_METRICS.length)).toFixed(2);
        const respAvg = (sums.responsibility / count).toFixed(2);
        const dilAvg = (sums.diligence / count).toFixed(2);
        const compAvg = (sums.competency / count).toFixed(2);
        const teamAvg = (sums.teamwork / count).toFixed(2);
        const helpAvg = (sums.helpfulness / count).toFixed(2);
        const safeAvg = (sums.safety / count).toFixed(2);
        const tasksJoined = Array.from(allTaskNamesSet).join("; ");

        csvContent += `"${emp.id}","${emp.name}","${emp.position}",${count},${overallAvg},${respAvg},${dilAvg},${compAvg},${teamAvg},${helpAvg},${safeAvg},"${tasksJoined}"\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานการประเมิน_ maintenance_${startDate}_ถึง_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                ระบบประเมินงานรายวันแผนกซ่อมบำรุง
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ระบบประเมิน 6 ด้านแบบไม่ระบุตัวตน (Anonymous Peer Review)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'evaluation' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              หน้าประเมิน
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              สรุปผล (หัวหน้างาน)
            </button>
          </div>
        </div>

        {/* GOOGLE SHEETS SYNC & SHIFT BAR */}
        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                วันที่ประเมิน:
                <input
                  type="date"
                  value={selectedWorkDate}
                  onChange={(e) => setSelectedWorkDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">|</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Work Date คำนวณจริง: 
                <strong className="text-emerald-400 font-mono text-sm ml-1">{calculatedShiftInfo.formattedWorkDate}</strong>
              </span>
              {getShiftBadge(calculatedShiftInfo.shift)}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400">จำลองกะ:</span>
                <select
                  value={selectedShiftOverride}
                  onChange={(e) => setSelectedShiftOverride(e.target.value)}
                  className="bg-slate-800 text-slate-200 text-[11px] rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="AUTO">อัตโนมัติ (ตามเวลาจริง)</option>
                  <option value="SHIFT_A">กะ A (08.30-20.30)</option>
                  <option value="SHIFT_B">กะ B (20.30-08.30)</option>
                  <option value="NORMAL">เวลาปกติ (08.30-17.30)</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="วาง URL Google Web App เพื่อเชื่อมต่อ Sheet..."
                value={sheetUrl}
                onChange={(e) => handleSaveSheetUrl(e.target.value)}
                className="bg-slate-900 text-xs border border-slate-700 text-slate-200 px-2.5 py-1 rounded w-56 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {isLoading && <span className="text-[11px] text-amber-400 animate-pulse">กำลังซิงค์...</span>}
              {syncStatus && !isLoading && <span className="text-[11px] text-emerald-400 font-medium">{syncStatus}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6">

        {/* TAB 1: EVALUATION FLOW */}
        {activeTab === 'evaluation' && (
          <div className="space-y-6">

            {/* STEP INDICATOR */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                <div className={`flex flex-col items-center z-10 ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step >= 1 ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' : 'bg-slate-100 text-slate-500'
                  }`}>
                    1
                  </div>
                  <span className="text-xs font-medium mt-1.5">ระบุผู้ประเมิน</span>
                </div>

                <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />

                <div className={`flex flex-col items-center z-10 ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step >= 2 ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' : 'bg-slate-100 text-slate-500'
                  }`}>
                    2
                  </div>
                  <span className="text-xs font-medium mt-1.5">เลือกเพื่อนร่วมงาน</span>
                </div>

                <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />

                <div className={`flex flex-col items-center z-10 ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step >= 3 ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' : 'bg-slate-100 text-slate-500'
                  }`}>
                    3
                  </div>
                  <span className="text-xs font-medium mt-1.5">ประเมิน 6 ด้าน & ภารกิจ</span>
                </div>
              </div>
            </div>

            {/* STEP 1: SELECT EVALUATOR */}
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    ขั้นตอนที่ 1: เลือกชื่อของคุณ (ผู้ให้คะแนน)
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    กรุณาเลือกชื่อของคุณเพื่อเริ่มต้นประเมินเพื่อนร่วมงาน (ชื่อของคุณจะไม่ถูกเปิดเผยต่อผู้อื่น)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {employees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectEvaluator(emp.id)}
                      className="flex flex-col text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-medium text-slate-400 group-hover:text-indigo-600">
                          {emp.id}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <span className="font-semibold text-slate-800 group-hover:text-indigo-900 text-sm">
                        {emp.name}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {emp.position}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: SELECT TEAMMATES */}
            {step === 2 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-indigo-600" />
                      ขั้นตอนที่ 2: ติ๊กเลือกเพื่อนร่วมงานที่จะประเมินวันนี้
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      ผู้ประเมิน: <strong className="text-indigo-600">{currentEvaluator?.name}</strong> (เลือกประเมินได้หลายคนพร้อมกัน)
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium self-start sm:self-center hover:underline"
                  >
                    ← เปลี่ยนผู้ประเมิน
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {allTeammatesExceptSelf.map(emp => {
                      const empIdStr = String(emp.id);
                      const isSelected = selectedEvaluateeIds.includes(empIdStr);
                      const existingEval = todayEvaluatedMap[empIdStr];

                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleTeammateSelection(emp.id)}
                          className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3 select-none relative ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600'
                              : existingEval 
                                ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-slate-900 text-sm block">
                                {emp.name}
                              </span>
                              {existingEval && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full shrink-0">
                                  <Edit3 className="w-3 h-3 text-amber-600" />
                                  แก้ไขคะแนน
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {emp.position} ({emp.id})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-600">
                      เลือกแล้ว <strong className="text-indigo-600 font-bold">{selectedEvaluateeIds.length}</strong> คน
                    </span>
                    <button
                      disabled={selectedEvaluateeIds.length === 0}
                      onClick={() => setStep(3)}
                      className={`px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-all ${
                        selectedEvaluateeIds.length > 0
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      เข้าสู่หน้าประเมิน
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: FILL ASSESSMENTS */}
            {step === 3 && (
              <form onSubmit={handleSubmitEvaluations} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      ขั้นตอนที่ 3: ระบุภารกิจและให้คะแนน (6 ด้าน)
                    </h2>
                    <p className="text-xs text-slate-500">
                      ผู้ถูกประเมินจำนวน {selectedEvaluateeIds.length} คน | Work Date: <strong className="text-indigo-600 font-mono">{calculatedShiftInfo.formattedWorkDate}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span>วันที่ประเมิน:</span>
                      <input
                        type="date"
                        value={selectedWorkDate}
                        onChange={(e) => setSelectedWorkDate(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded px-2 py-1 font-mono focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs text-indigo-600 hover:underline font-medium ml-2"
                    >
                      ← กลับไปเลือกคนใหม่
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {selectedEvaluateeIds.map(eId => {
                    const teammate = employees.find(e => String(e.id) === String(eId));
                    const currentVal = assessmentData[eId] || { 
                      scores: { responsibility: 5, diligence: 5, competency: 5, teamwork: 5, helpfulness: 5, safety: 5 }, 
                      selectedTasks: [],
                      customTasks: []
                    };
                    const isEditing = !!todayEvaluatedMap[eId];
                    const customTasksList = currentVal.customTasks || [];

                    return (
                      <div key={eId} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 relative overflow-hidden">
                        {isEditing && (
                          <div className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg absolute top-0 right-0">
                            โหมดแก้ไขคะแนนของวันนี้
                          </div>
                        )}

                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                            {teammate?.name.charAt(3) || 'ช'}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{teammate?.name}</h3>
                            <p className="text-xs text-slate-500">{teammate?.position} ({teammate?.id})</p>
                          </div>
                        </div>

                        {/* TASKS SELECTION */}
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-slate-700">
                            1. วันนี้เพื่อนคนนี้ทำภารกิจอะไรบ้าง? (เลือกภารกิจหลัก)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {tasks.map(task => {
                              const isChecked = currentVal.selectedTasks?.includes(task.id);
                              return (
                                <button
                                  type="button"
                                  key={task.id}
                                  onClick={() => handleTaskToggle(eId, task.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left flex items-center gap-1.5 ${
                                    isChecked
                                      ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-sm'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                                    isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-400 bg-white'
                                  }`}>
                                    {isChecked && '✓'}
                                  </span>
                                  {task.name}
                                </button>
                              );
                            })}
                          </div>

                          {/* CUSTOM DYNAMIC TASKS (MAX 5) */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                ภารกิจเพิ่มเติมที่พิมพ์ระบุเอง (สูงสุด 5 หัวข้อ):
                              </span>
                              {customTasksList.length < 5 && (
                                <button
                                  type="button"
                                  onClick={() => handleAddCustomTask(eId)}
                                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 border border-indigo-200"
                                >
                                  <Plus className="w-3 h-3" />
                                  เพิ่มภารกิจเอง ({customTasksList.length}/5)
                                </button>
                              )}
                            </div>

                            <div className="space-y-2">
                              {customTasksList.map((taskText, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 font-mono w-4">{idx + 1}.</span>
                                  <input
                                    type="text"
                                    value={taskText}
                                    onChange={(e) => handleCustomTaskChange(eId, idx, e.target.value)}
                                    placeholder={`ระบุรายละเอียดภารกิจที่ ${idx + 1}...`}
                                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomTask(eId, idx)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 6 EVALUATION METRICS */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-3">
                            2. ประเมินการทำงานตาม 6 คุณลักษณะ (1 - 5 ดาว)
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {EVAL_METRICS.map(metric => {
                              const IconComponent = metric.icon;
                              const currentScore = currentVal.scores?.[metric.key] || 5;

                              return (
                                <div key={metric.key} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                      <IconComponent className="w-4 h-4 text-indigo-600" />
                                      {metric.label}
                                    </span>
                                    <span className="text-xs font-bold text-amber-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {currentScore} / 5
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 pt-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <button
                                        type="button"
                                        key={star}
                                        onClick={() => handleScoreMetricChange(eId, metric.key, star)}
                                        className="p-1 hover:scale-110 transition-transform focus:outline-none"
                                      >
                                        <Star
                                          className={`w-6 h-6 ${
                                            star <= currentScore
                                              ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                                              : 'text-slate-300'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    บันทึก / อัปเดตผลการประเมิน
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 4 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">บันทึกผลการประเมินสำเร็จ!</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    ระบบบันทึกคะแนนและภารกิจงานเรียบร้อยแล้ว โดยรักษาความเป็นลับ (Anonymous)
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100 text-xs text-slate-600 space-y-1">
                  <p><strong>วันที่บันทึก (Work Date):</strong> {calculatedShiftInfo.formattedWorkDate}</p>
                  <p><strong>จำนวนคนที่ประเมิน:</strong> {selectedEvaluateeIds.length} คน</p>
                  <p className="text-emerald-700 font-medium">✓ สถานะ: อัปเดตข้อมูลเรียบร้อยแล้ว</p>
                </div>
                <button
                  onClick={resetForm}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  ทำรายการประเมินใหม่
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADMIN DASHBOARD */}
        {activeTab === 'admin' && (
          <div className="space-y-6">

            {/* BANNER & EXPORT */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex items-start justify-between gap-4 flex-col sm:flex-row">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    สรุปผลการประเมินพนักงานซ่อมบำรุง (สำหรับหัวหน้างาน)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    *ผลสรุปคำนวณจากคะแนนเฉลี่ย 6 ด้านแบบ Anonymous คลิกที่ชื่อช่างเพื่อดูภารกิจรายวัน
                  </p>
                </div>
              </div>

              <button
                onClick={exportToCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 shrink-0 self-end sm:self-center"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export เป็น Excel (.csv)
              </button>
            </div>

            {/* VIEW MODE TABS: DAILY vs MONTHLY/RANGE */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setAdminViewMode('daily')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    adminViewMode === 'daily'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  สรุปรายวัน
                </button>
                <button
                  onClick={() => setAdminViewMode('monthly')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    adminViewMode === 'monthly'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  สรุปรายเดือน / เลือกช่วงเวลา
                </button>
              </div>

              {/* DATE SELECTORS */}
              {adminViewMode === 'daily' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">เลือกวันที่:</span>
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">เริ่ม:</span>
                  <input
                    type="date"
                    value={dateFilterStart}
                    onChange={(e) => setDateFilterStart(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  />
                  <span className="text-slate-400 text-xs">ถึง</span>
                  <span className="text-xs text-slate-500">สิ้นสุด:</span>
                  <input
                    type="date"
                    value={dateFilterEnd}
                    onChange={(e) => setDateFilterEnd(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  />
                </div>
              )}
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-sm">
                  {adminViewMode === 'daily' 
                    ? `ตารางคะแนนและภารกิจ ณ วันที่ ${selectedDailyDate}`
                    : `ตารางคะแนนเฉลี่ยสะสม (${dateFilterStart} ถึง ${dateFilterEnd})`
                  }
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">พนักงาน (คลิกเพื่อดูภารกิจ)</th>
                      <th className="px-3 py-3.5 text-center">ผู้ประเมิน</th>
                      <th className="px-3 py-3.5 text-center bg-indigo-50 text-indigo-900">เฉลี่ยรวม</th>
                      <th className="px-3 py-3.5 text-center">1.รับผิดชอบ</th>
                      <th className="px-3 py-3.5 text-center">2.กระตือรือร้น</th>
                      <th className="px-3 py-3.5 text-center">3.ความสามารถ</th>
                      <th className="px-3 py-3.5 text-center">4.ทีมงาน</th>
                      <th className="px-3 py-3.5 text-center">5.ช่วยเหลือ</th>
                      <th className="px-3 py-3.5 text-center">6.ปลอดภัย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map(emp => {
                      const startDate = adminViewMode === 'daily' ? selectedDailyDate : dateFilterStart;
                      const endDate = adminViewMode === 'daily' ? selectedDailyDate : dateFilterEnd;

                      const empEvals = evaluations.filter(
                        e => String(e.evaluateeId) === String(emp.id) && e.workDate >= startDate && e.workDate <= endDate
                      );

                      const count = empEvals.length;

                      if (count === 0) {
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3.5">
                              <button
                                onClick={() => setDetailModalEmployee({ employee: emp, evals: [] })}
                                className="font-bold text-slate-700 hover:text-indigo-600 text-left hover:underline block"
                              >
                                {emp.name}
                              </button>
                              <span className="text-[11px] text-slate-400">{emp.position} ({emp.id})</span>
                            </td>
                            <td className="px-3 py-3.5 text-center text-slate-400">0 คน</td>
                            <td className="px-3 py-3.5 text-center bg-indigo-50/50 text-slate-300">-</td>
                            <td className="px-3 py-3.5 text-center text-slate-300">-</td>
                            <td className="px-3 py-3.5 text-center text-slate-300">-</td>
                            <td className="px-3 py-3.5 text-center text-slate-300">-</td>
                            <td className="px-3 py-3.5 text-center text-slate-300">-</td>
                            <td className="px-3 py-3.5 text-center text-slate-300">-</td>
                            <td className="px-3 py-3.5 text-center text-slate-300">-</td>
                          </tr>
                        );
                      }

                      const sums = { responsibility: 0, diligence: 0, competency: 0, teamwork: 0, helpfulness: 0, safety: 0 };
                      let grandTotal = 0;

                      empEvals.forEach(e => {
                        EVAL_METRICS.forEach(m => {
                          const val = e.scores?.[m.key] || 0;
                          sums[m.key] += val;
                          grandTotal += val;
                        });
                      });

                      const overallAvg = (grandTotal / (count * EVAL_METRICS.length)).toFixed(2);
                      const respAvg = (sums.responsibility / count).toFixed(1);
                      const dilAvg = (sums.diligence / count).toFixed(1);
                      const compAvg = (sums.competency / count).toFixed(1);
                      const teamAvg = (sums.teamwork / count).toFixed(1);
                      const helpAvg = (sums.helpfulness / count).toFixed(1);
                      const safeAvg = (sums.safety / count).toFixed(1);

                      return (
                        <tr key={emp.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => setDetailModalEmployee({ employee: emp, evals: empEvals })}
                              className="font-bold text-indigo-700 hover:text-indigo-900 text-left hover:underline flex items-center gap-1.5 group"
                            >
                              <span>{emp.name}</span>
                              <ListTodo className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600" />
                            </button>
                            <span className="text-[11px] text-slate-400">{emp.position} ({emp.id})</span>
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                              {count} คน
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center bg-indigo-50 font-bold text-indigo-700 text-sm">
                            <span className="inline-flex items-center gap-0.5">
                              {overallAvg}
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center font-medium text-slate-700">{respAvg}</td>
                          <td className="px-3 py-3.5 text-center font-medium text-slate-700">{dilAvg}</td>
                          <td className="px-3 py-3.5 text-center font-medium text-slate-700">{compAvg}</td>
                          <td className="px-3 py-3.5 text-center font-medium text-slate-700">{teamAvg}</td>
                          <td className="px-3 py-3.5 text-center font-medium text-slate-700">{helpAvg}</td>
                          <td className="px-3 py-3.5 text-center font-medium text-slate-700">{safeAvg}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DETAIL POPUP MODAL */}
        {detailModalEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-indigo-400" />
                    ประวัติภารกิจการทำงาน: {detailModalEmployee.employee.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {detailModalEmployee.employee.position} ({detailModalEmployee.employee.id})
                  </p>
                </div>
                <button
                  onClick={() => setDetailModalEmployee(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {detailModalEmployee.evals.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    ไม่มีประวัติการถูกประเมินหรือภารกิจงานในช่วงเวลานี้
                  </div>
                ) : (
                  detailModalEmployee.evals.map((e, index) => {
                    const masterTaskNames = (e.tasks || []).map(tId => tasks.find(t => t.id === tId)?.name || tId);
                    const customTaskNames = e.customTasks || [];

                    return (
                      <div key={e.id || index} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
                          <span className="font-mono font-bold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            วันที่: {e.workDate}
                          </span>
                          {getShiftBadge(e.shift)}
                        </div>

                        <div>
                          <span className="text-xs font-semibold text-slate-800 block mb-1.5">
                            รายการภารกิจที่ทำในวันนั้น:
                          </span>
                          <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                            {masterTaskNames.map((tName, i) => (
                              <li key={i} className="font-medium text-slate-800">{tName}</li>
                            ))}
                            {customTaskNames.map((cName, i) => (
                              <li key={`custom-${i}`} className="font-medium text-indigo-900 bg-indigo-50/80 px-1.5 py-0.5 rounded inline-block">
                                [ระบุเอง] {cName}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px]">
                          {EVAL_METRICS.map(m => (
                            <div key={m.key} className="bg-white p-1.5 rounded border border-slate-200">
                              <span className="text-[10px] text-slate-400 block truncate">{m.label.split('.')[1]}</span>
                              <strong className="text-amber-600 font-bold">{e.scores?.[m.key] || 0}★</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setDetailModalEmployee(null)}
                  className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
