import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MetricsBar from "@/components/MetricsBar";
import IdeaInputPanel from "@/components/ideas/IdeaInputPanel";
import IdeaGraph from "@/components/ideas/IdeaGraph";
import IdeaDetailPanel from "@/components/ideas/IdeaDetailPanel";
import { useAgents } from "@/contexts/AgentContext";
import { useIdeas } from "@/hooks/useIdeas";

const Ideas = () => {
  const navigate = useNavigate();
  const { agents } = useAgents();
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const {
    projects, currentProject, nodes, edges, isGenerating,
    loadProject, generateIdeas, expandIdea, updateNode, deleteNode, deleteProject, newProject,
  } = useIdeas();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", { replace: true });
      } else {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    updateNode(id, { position_x: x, position_y: y });
  }, [updateNode]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  if (!authChecked) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <MetricsBar agents={agents} />
      <div className="flex flex-1 overflow-hidden">
        <IdeaInputPanel
          isGenerating={isGenerating}
          projects={projects}
          currentProject={currentProject}
          onGenerate={generateIdeas}
          onLoadProject={loadProject}
          onDeleteProject={deleteProject}
          onNewProject={newProject}
        />
        <IdeaGraph
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          isGenerating={isGenerating}
          onSelectNode={setSelectedNodeId}
          onDoubleClickNode={expandIdea}
          onUpdateNodePosition={handleUpdatePosition}
        />
        <IdeaDetailPanel
          node={selectedNode}
          isGenerating={isGenerating}
          onExpand={expandIdea}
          onUpdate={updateNode}
          onDelete={deleteNode}
        />
      </div>
    </div>
  );
};

export default Ideas;
