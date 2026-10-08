import React, { useState, useEffect } from 'react';
import { generateSchema } from '../services/api';

type SchemaTab = 'Course' | 'FAQPage' | 'Article' | 'Organization' | 'HowTo';

export const SchemaGeneratorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SchemaTab>('Course');
  const [copied, setCopied] = useState<boolean>(false);
  const [generatedJson, setGeneratedJson] = useState<string>('');

  // Course Form State
  const [courseName, setCourseName] = useState('CCBP 4.0 Intensive Academy');
  const [courseDesc, setCourseDesc] = useState('Industry-aligned software development and emerging tech program for college freshers.');
  const [courseProvider, setCourseProvider] = useState('NxtWave Disruptive Technologies');
  const [coursePrice, setCoursePrice] = useState('45000');

  // FAQ Form State
  const [faqQ1, setFaqQ1] = useState('What is the eligibility for NxtWave CCBP 4.0?');
  const [faqA1, setFaqA1] = useState('Any college student or graduate from engineering, science, or commerce streams can apply.');
  const [faqQ2, setFaqQ2] = useState('Does CCBP offer placement assistance?');
  const [faqA2, setFaqA2] = useState('Yes, dedicated placement support connects students with 1,500+ hiring partners across India.');

  // Article Form State
  const [artHeadline, setArtHeadline] = useState('MERN Stack vs Python Full Stack Roadmap in 2026');
  const [artDesc, setArtDesc] = useState('A comprehensive comparative guide for engineering students choosing their first web development stack.');
  const [artUrl, setArtUrl] = useState('https://www.nxtwave.co.in/blog/mern-vs-python');
  const [artAuthor, setArtAuthor] = useState('Rahul Attuluri');

  // Organization Form State
  const [orgName, setOrgName] = useState('NxtWave Disruptive Technologies');
  const [orgUrl, setOrgUrl] = useState('https://www.nxtwave.co.in');
  const [orgLogo, setOrgLogo] = useState('https://www.nxtwave.co.in/logo.png');
  const [orgDesc, setOrgDesc] = useState('Hyderabad-based EdTech company focused on industry-relevant technology upskilling.');

  // HowTo Form State
  const [howName, setHowName] = useState('How to Prepare for Software Developer Campus Placements');
  const [howDesc, setHowDesc] = useState('Step-by-step 4-month preparation strategy for non-CS engineering students.');
  const [howStep1, setHowStep1] = useState('Master Programming Fundamentals and Data Structures');
  const [howStep2, setHowStep2] = useState('Build 2 Production-Grade Full Stack Portfolio Projects');

  const updatePreview = async () => {
    let payloadData: any = {};

    if (activeTab === 'Course') {
      payloadData = {
        name: courseName,
        description: courseDesc,
        provider_name: courseProvider,
        price: coursePrice,
        currency: 'INR'
      };
    } else if (activeTab === 'FAQPage') {
      payloadData = {
        qa_pairs: [
          { question: faqQ1, answer: faqA1 },
          { question: faqQ2, answer: faqA2 }
        ]
      };
    } else if (activeTab === 'Article') {
      payloadData = {
        headline: artHeadline,
        description: artDesc,
        url: artUrl,
        author_name: artAuthor,
        publisher_name: 'NxtWave',
        date_published: '2026-02-15'
      };
    } else if (activeTab === 'Organization') {
      payloadData = {
        name: orgName,
        url: orgUrl,
        logo_url: orgLogo,
        description: orgDesc,
        social_urls: ['https://www.linkedin.com/company/nxtwave', 'https://twitter.com/nxtwave_tech']
      };
    } else if (activeTab === 'HowTo') {
      payloadData = {
        name: howName,
        description: howDesc,
        total_time: 'PT4M',
        steps: [
          { title: 'Step 1', text: howStep1 },
          { title: 'Step 2', text: howStep2 }
        ]
      };
    }

    try {
      const res = await generateSchema(activeTab, payloadData);
      setGeneratedJson(JSON.stringify(res.json_ld, null, 2));
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    updatePreview();
  }, [
    activeTab, courseName, courseDesc, courseProvider, coursePrice,
    faqQ1, faqA1, faqQ2, faqA2,
    artHeadline, artDesc, artUrl, artAuthor,
    orgName, orgUrl, orgLogo, orgDesc,
    howName, howDesc, howStep1, howStep2
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">EdTech Schema Generator</h1>
          <p className="page-description">
            Generate Google Search Central-compliant JSON-LD structured data for rich snippets and Knowledge Graph inclusion.
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['Course', 'FAQPage', 'Article', 'Organization', 'HowTo'] as SchemaTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`btn ${activeTab === tab ? 'btn-teal' : 'btn-ghost'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'FAQPage' ? 'FAQ Page' : tab}
          </button>
        ))}
      </div>

      {/* 2-Column: Form on Left & Code Preview on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 24, alignItems: 'start' }}>
        {/* Left Form */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3 className="panel-title">{activeTab} Structured Properties</h3>
          </div>

          {activeTab === 'Course' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Course Name:</label>
                <input type="text" className="form-input" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Description:</label>
                <textarea className="form-textarea" rows={3} value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Provider Name:</label>
                  <input type="text" className="form-input" value={courseProvider} onChange={(e) => setCourseProvider(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Tuition (INR):</label>
                  <input type="text" className="form-input" value={coursePrice} onChange={(e) => setCoursePrice(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FAQPage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Question 1:</label>
                <input type="text" className="form-input" value={faqQ1} onChange={(e) => setFaqQ1(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Answer 1:</label>
                <textarea className="form-textarea" rows={2} value={faqA1} onChange={(e) => setFaqA1(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Question 2:</label>
                <input type="text" className="form-input" value={faqQ2} onChange={(e) => setFaqQ2(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Answer 2:</label>
                <textarea className="form-textarea" rows={2} value={faqA2} onChange={(e) => setFaqA2(e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'Article' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Article Headline:</label>
                <input type="text" className="form-input" value={artHeadline} onChange={(e) => setArtHeadline(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Meta Summary:</label>
                <textarea className="form-textarea" rows={3} value={artDesc} onChange={(e) => setArtDesc(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Author:</label>
                  <input type="text" className="form-input" value={artAuthor} onChange={(e) => setArtAuthor(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Canonical URL:</label>
                  <input type="text" className="form-input" value={artUrl} onChange={(e) => setArtUrl(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Organization' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Organization Name:</label>
                <input type="text" className="form-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Website URL:</label>
                <input type="text" className="form-input" value={orgUrl} onChange={(e) => setOrgUrl(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Logo URL:</label>
                <input type="text" className="form-input" value={orgLogo} onChange={(e) => setOrgLogo(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Mission Summary:</label>
                <textarea className="form-textarea" rows={2} value={orgDesc} onChange={(e) => setOrgDesc(e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'HowTo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Guide Title:</label>
                <input type="text" className="form-input" value={howName} onChange={(e) => setHowName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Summary:</label>
                <textarea className="form-textarea" rows={2} value={howDesc} onChange={(e) => setHowDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Step 1:</label>
                <input type="text" className="form-input" value={howStep1} onChange={(e) => setHowStep1(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>Step 2:</label>
                <input type="text" className="form-input" value={howStep2} onChange={(e) => setHowStep2(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Right Live JSON-LD Preview */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-pill green">✓ Valid Schema.org JSON-LD</span>
            </div>
            <button
              type="button"
              className="btn btn-teal"
              style={{ fontSize: '0.75rem', padding: '3px 10px' }}
              onClick={handleCopy}
            >
              {copied ? 'Copied to Clipboard' : 'Copy JSON-LD'}
            </button>
          </div>

          <pre className="code-panel">
            {generatedJson}
          </pre>

          <p style={{ marginTop: 12, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Paste this snippet inside a <code>&lt;script type="application/ld+json"&gt;</code> block in your webpage's <code>&lt;head&gt;</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
