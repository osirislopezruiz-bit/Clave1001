import fs from 'fs';
import path from 'path';

const file = 'C:/Users/Usuario/Desktop/clave-1001-standalone/src/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Add import
const importIdx = lines.findIndex(l => l.includes("import { supabase }"));
lines.splice(importIdx, 0, "import FranchiseManager from './components/admin/FranchiseManager';");

// Re-join and find the exact block for view === 'orgs'
content = lines.join('\n');

const startStr = "          {view === 'orgs' && (";
const endStr = "          )}";

const startIndex = content.indexOf(startStr);
// We want to find the specific closing tag. 
// We know it's right before `{view === 'iot' && (`
const iotIndex = content.indexOf("{view === 'iot' && (");
const blockStr = content.substring(startIndex, iotIndex);
const exactEnd = blockStr.lastIndexOf(")}");

const replacement = `          {view === 'orgs' && (
            <FranchiseManager 
              orgs={orgs}
              setSelectedOrg={setSelectedOrg}
              setNewOrg={setNewOrg}
              setShowOrgModal={setShowOrgModal}
              franchiseDetail={franchiseDetail}
              setFranchiseDetail={setFranchiseDetail}
              handleGenerateAdmin={handleGenerateAdmin}
              isGeneratingAdmin={isGeneratingAdmin}
              handleMasterOverride={handleMasterOverride}
            />
          `;

const finalContent = content.substring(0, startIndex) + replacement + content.substring(startIndex + exactEnd + 2);
fs.writeFileSync(file, finalContent, 'utf8');
console.log("Refactored AdminPanel.jsx successfully!");
