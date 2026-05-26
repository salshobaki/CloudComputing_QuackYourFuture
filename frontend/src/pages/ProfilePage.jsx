import React, { useState, useEffect } from 'react';
import { getProfile, saveProfile } from '../api';

const uid = () => Math.random().toString(36).slice(2);

const emptyExperience = () => ({
  id: uid(), company: '', role: '', startDate: '', endDate: '', description: '',
});

const emptyEducation = () => ({
  id: uid(), institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '',
});

// ─── Reusable primitives ────────────────────────────────────────────────────

function Card({ title, icon, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6">
      <h2 className="text-lg font-bold text-blue-900 mb-5 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-blue-800">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'rounded-xl border-2 border-blue-100 bg-blue-50/40 px-3 py-2 text-sm text-gray-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition';

// ─── Section components ──────────────────────────────────────────────────────

function BasicInfo({ data, onChange }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value });
  return (
    <Card title="Basic Info" icon="🦆">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name">
          <input className={inputCls} value={data.fullName} onChange={set('fullName')} placeholder="Jane Duck" />
        </Field>
        <Field label="Job Title">
          <input className={inputCls} value={data.jobTitle} onChange={set('jobTitle')} placeholder="Senior Quacker" />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={data.email} onChange={set('email')} placeholder="jane@pond.com" />
        </Field>
        <Field label="Phone Number">
          <input className={inputCls} type="tel" value={data.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Summary">
          <textarea
            className={`${inputCls} resize-none`}
            rows={4}
            value={data.summary}
            onChange={set('summary')}
            placeholder="A short professional summary... (quack!)"
          />
        </Field>
      </div>
    </Card>
  );
}

function ExperienceSection({ items, onChange }) {
  const update = (id, field) => (e) =>
    onChange(items.map((x) => (x.id === id ? { ...x, [field]: e.target.value } : x)));
  const remove = (id) => onChange(items.filter((x) => x.id !== id));
  const add = () => onChange([...items, emptyExperience()]);

  return (
    <Card title="Experience" icon="💼">
      <div className="space-y-5">
        {items.map((exp, i) => (
          <div key={exp.id} className="rounded-xl border-2 border-yellow-100 p-4 bg-amber-50 relative">
            <span className="absolute top-3 left-4 text-xs font-bold text-yellow-600 uppercase tracking-wide">
              #{i + 1}
            </span>
            <button
              onClick={() => remove(exp.id)}
              className="absolute top-3 right-4 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
            >
              Remove
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <Field label="Company">
                <input className={inputCls} value={exp.company} onChange={update(exp.id, 'company')} placeholder="Duck Corp" />
              </Field>
              <Field label="Role">
                <input className={inputCls} value={exp.role} onChange={update(exp.id, 'role')} placeholder="Lead Quacker" />
              </Field>
              <Field label="Start Date">
                <input className={inputCls} type="month" value={exp.startDate} onChange={update(exp.id, 'startDate')} />
              </Field>
              <Field label="End Date">
                <input className={inputCls} type="month" value={exp.endDate} onChange={update(exp.id, 'endDate')} placeholder="Present" />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Description">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={exp.description}
                  onChange={update(exp.id, 'description')}
                  placeholder="Key responsibilities and achievements..."
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-4 flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors"
      >
        <span className="text-lg leading-none">+</span> Add Experience
      </button>
    </Card>
  );
}

function EducationSection({ items, onChange }) {
  const update = (id, field) => (e) =>
    onChange(items.map((x) => (x.id === id ? { ...x, [field]: e.target.value } : x)));
  const remove = (id) => onChange(items.filter((x) => x.id !== id));
  const add = () => onChange([...items, emptyEducation()]);

  return (
    <Card title="Education" icon="🎓">
      <div className="space-y-5">
        {items.map((edu, i) => (
          <div key={edu.id} className="rounded-xl border-2 border-yellow-100 p-4 bg-amber-50 relative">
            <span className="absolute top-3 left-4 text-xs font-bold text-yellow-600 uppercase tracking-wide">
              #{i + 1}
            </span>
            <button
              onClick={() => remove(edu.id)}
              className="absolute top-3 right-4 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
            >
              Remove
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <Field label="Institution">
                <input className={inputCls} value={edu.institution} onChange={update(edu.id, 'institution')} placeholder="Pond University" />
              </Field>
              <Field label="Degree">
                <input className={inputCls} value={edu.degree} onChange={update(edu.id, 'degree')} placeholder="Bachelor of Quacking" />
              </Field>
              <Field label="Field of Study">
                <input className={inputCls} value={edu.fieldOfStudy} onChange={update(edu.id, 'fieldOfStudy')} placeholder="Computer Science" />
              </Field>
              <div />
              <Field label="Start Date">
                <input className={inputCls} type="month" value={edu.startDate} onChange={update(edu.id, 'startDate')} />
              </Field>
              <Field label="End Date">
                <input className={inputCls} type="month" value={edu.endDate} onChange={update(edu.id, 'endDate')} />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-4 flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors"
      >
        <span className="text-lg leading-none">+</span> Add Education
      </button>
    </Card>
  );
}

function SkillsSection({ skills, onChange }) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const skill = input.trim();
      if (skill && !skills.includes(skill)) {
        onChange([...skills, skill]);
      }
      setInput('');
    }
  };

  const remove = (skill) => onChange(skills.filter((s) => s !== skill));

  return (
    <Card title="Skills" icon="⚡">
      <input
        className={inputCls + ' w-full'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a skill and press Enter (e.g. React)"
      />
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 bg-yellow-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full border border-yellow-300"
            >
              {skill}
              <button
                onClick={() => remove(skill)}
                className="text-yellow-500 hover:text-blue-900 leading-none transition-colors"
                aria-label={`Remove ${skill}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function Toast({ onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 bg-blue-900 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in z-50 border-2 border-yellow-400">
      <span className="text-yellow-400">🦆</span>
      Profile saved successfully!
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [basicInfo, setBasicInfo] = useState({
    fullName: '', jobTitle: '', email: '', phone: '', summary: '',
  });
  const [experience, setExperience] = useState([]);
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);

  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError]   = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveError, setSaveError]   = useState('');

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (!data.empty) {
          if (data.basicInfo)  setBasicInfo(data.basicInfo);
          if (data.experience) setExperience(data.experience);
          if (data.education)  setEducation(data.education);
          if (data.skills)     setSkills(data.skills);
        }
        setLoadStatus('done');
      })
      .catch((err) => {
        setLoadError(err.message);
        setLoadStatus('error');
      });
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    setSaveError('');
    const payload = { basicInfo, experience, education, skills };
    console.log('Saving profile payload:', JSON.stringify(payload, null, 2));
    try {
      await saveProfile(payload);
      setSaveStatus('success');
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus('error');
    }
  };

  if (loadStatus === 'loading') {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3 text-yellow-500">
          <svg className="animate-spin h-10 w-10" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-semibold text-blue-700">Fetching your feathers...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-blue-900 flex items-center gap-2">
          <span>🦆</span> Your Pond Profile
        </h1>
        <p className="text-blue-500 mt-1 text-sm font-medium">Fill in your details to hatch a tailored CV.</p>
      </div>

      {loadStatus === 'error' && (
        <p className="mb-6 text-sm text-red-500 flex items-center gap-1.5">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Could not load saved profile: {loadError}
        </p>
      )}

      <div className="space-y-6">
        <BasicInfo data={basicInfo} onChange={setBasicInfo} />
        <ExperienceSection items={experience} onChange={setExperience} />
        <EducationSection items={education} onChange={setEducation} />
        <SkillsSection skills={skills} onChange={setSkills} />
      </div>

      <div className="mt-8 flex flex-col items-end gap-3">
        {saveStatus === 'error' && (
          <p className="text-sm text-red-500 flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {saveError}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 disabled:bg-yellow-200 disabled:cursor-not-allowed text-blue-900 font-extrabold px-8 py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-yellow-400/30"
        >
          {saveStatus === 'saving' ? (
            <>
              <svg className="animate-spin h-4 w-4 text-blue-900" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving...
            </>
          ) : '🦆 Save Profile'}
        </button>
      </div>

      {saveStatus === 'success' && <Toast onDone={() => setSaveStatus('idle')} />}
    </main>
  );
}
