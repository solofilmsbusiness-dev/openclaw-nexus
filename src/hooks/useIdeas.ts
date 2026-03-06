import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IdeaNode {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  details: string;
  notes: string;
  color: string | null;
  position_x: number;
  position_y: number;
  parent_node_id: string | null;
  created_at: string;
}

export interface IdeaEdge {
  id: string;
  project_id: string;
  user_id: string;
  from_node_id: string;
  to_node_id: string;
  label: string;
  created_at: string;
}

export interface IdeaProject {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  category: string | null;
  mood: string | null;
  created_at: string;
  updated_at: string;
}

export function useIdeas() {
  const [projects, setProjects] = useState<IdeaProject[]>([]);
  const [currentProject, setCurrentProject] = useState<IdeaProject | null>(null);
  const [nodes, setNodes] = useState<IdeaNode[]>([]);
  const [edges, setEdges] = useState<IdeaEdge[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
  }, []);

  const loadProjects = useCallback(async () => {
    const { data } = await supabase
      .from("idea_projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setProjects(data as unknown as IdeaProject[]);
  }, []);

  useEffect(() => {
    if (userId) loadProjects();
  }, [userId, loadProjects]);

  const loadProject = useCallback(async (projectId: string) => {
    const { data: proj } = await supabase
      .from("idea_projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (proj) setCurrentProject(proj as unknown as IdeaProject);

    const { data: nodeData } = await supabase
      .from("idea_nodes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");
    if (nodeData) setNodes(nodeData as unknown as IdeaNode[]);

    const { data: edgeData } = await supabase
      .from("idea_edges")
      .select("*")
      .eq("project_id", projectId);
    if (edgeData) setEdges(edgeData as unknown as IdeaEdge[]);
  }, []);

  const generateIdeas = useCallback(async (topic: string, category?: string, mood?: string, constraints?: string) => {
    if (!userId) return;
    setIsGenerating(true);
    try {
      // Create project
      const { data: proj, error: projErr } = await supabase
        .from("idea_projects")
        .insert({ user_id: userId, name: topic.slice(0, 50), prompt: topic, category: category || null, mood: mood || null } as any)
        .select()
        .single();
      if (projErr || !proj) throw projErr;
      const project = proj as unknown as IdeaProject;

      // Call AI
      const { data: aiData, error: aiErr } = await supabase.functions.invoke("generate-ideas", {
        body: { mode: "generate", topic, category, mood, constraints },
      });
      if (aiErr) throw aiErr;

      const ideas: { title: string; description: string; tags: string[] }[] = aiData.ideas || [];
      if (!ideas.length) throw new Error("No ideas generated");

      // Create central prompt node
      const { data: centerNode } = await supabase
        .from("idea_nodes")
        .insert({ project_id: project.id, user_id: userId, content: topic, details: `Category: ${category || "General"}\nMood: ${mood || "Any"}`, color: null, position_x: 400, position_y: 300 } as any)
        .select()
        .single();
      if (!centerNode) throw new Error("Failed to create center node");
      const center = centerNode as unknown as IdeaNode;

      // Create idea nodes in a circle around center
      const angleStep = (2 * Math.PI) / ideas.length;
      const radius = 200;
      const newNodes: IdeaNode[] = [center];
      const newEdges: IdeaEdge[] = [];

      for (let i = 0; i < ideas.length; i++) {
        const angle = angleStep * i - Math.PI / 2;
        const x = 400 + radius * Math.cos(angle);
        const y = 300 + radius * Math.sin(angle);
        const colors = ["hsl(195, 60%, 55%)", "hsl(152, 60%, 48%)", "hsl(270, 50%, 60%)", "hsl(38, 70%, 55%)", "hsl(215, 80%, 60%)"];

        const { data: node } = await supabase
          .from("idea_nodes")
          .insert({
            project_id: project.id, user_id: userId, content: ideas[i].title,
            details: ideas[i].description, notes: "", color: colors[i % colors.length],
            position_x: x, position_y: y, parent_node_id: center.id,
          } as any)
          .select()
          .single();
        if (node) {
          const n = node as unknown as IdeaNode;
          newNodes.push(n);
          // Create edge from center to this node
          const { data: edge } = await supabase
            .from("idea_edges")
            .insert({ project_id: project.id, user_id: userId, from_node_id: center.id, to_node_id: n.id, label: "generated" } as any)
            .select()
            .single();
          if (edge) newEdges.push(edge as unknown as IdeaEdge);
        }
      }

      setCurrentProject(project);
      setNodes(newNodes);
      setEdges(newEdges);
      await loadProjects();
      toast.success("Ideas generated!", { description: `${ideas.length} concepts created` });
    } catch (err: any) {
      console.error(err);
      toast.error("Generation failed", { description: err?.message || "Unknown error" });
    } finally {
      setIsGenerating(false);
    }
  }, [userId, loadProjects]);

  const expandIdea = useCallback(async (nodeId: string) => {
    if (!userId || !currentProject) return;
    const parentNode = nodes.find(n => n.id === nodeId);
    if (!parentNode) return;
    setIsGenerating(true);
    try {
      const { data: aiData, error: aiErr } = await supabase.functions.invoke("generate-ideas", {
        body: { mode: "expand", parentIdea: parentNode.content + ": " + parentNode.details, category: currentProject.category, mood: currentProject.mood },
      });
      if (aiErr) throw aiErr;

      const ideas: { title: string; description: string; tags: string[] }[] = aiData.ideas || [];
      const angleStep = (2 * Math.PI) / ideas.length;
      const radius = 120;
      const newNodes: IdeaNode[] = [];
      const newEdges: IdeaEdge[] = [];
      const colors = ["hsl(195, 60%, 55%)", "hsl(152, 60%, 48%)", "hsl(270, 50%, 60%)", "hsl(38, 70%, 55%)"];

      for (let i = 0; i < ideas.length; i++) {
        const angle = angleStep * i - Math.PI / 2;
        const x = parentNode.position_x + radius * Math.cos(angle);
        const y = parentNode.position_y + radius * Math.sin(angle);

        const { data: node } = await supabase
          .from("idea_nodes")
          .insert({
            project_id: currentProject.id, user_id: userId, content: ideas[i].title,
            details: ideas[i].description, notes: "", color: colors[i % colors.length],
            position_x: x, position_y: y, parent_node_id: parentNode.id,
          } as any)
          .select()
          .single();
        if (node) {
          const n = node as unknown as IdeaNode;
          newNodes.push(n);
          const { data: edge } = await supabase
            .from("idea_edges")
            .insert({ project_id: currentProject.id, user_id: userId, from_node_id: parentNode.id, to_node_id: n.id, label: "expanded" } as any)
            .select()
            .single();
          if (edge) newEdges.push(edge as unknown as IdeaEdge);
        }
      }

      setNodes(prev => [...prev, ...newNodes]);
      setEdges(prev => [...prev, ...newEdges]);
      toast.success("Idea expanded!", { description: `${ideas.length} sub-ideas created` });
    } catch (err: any) {
      toast.error("Expansion failed", { description: err?.message || "Unknown error" });
    } finally {
      setIsGenerating(false);
    }
  }, [userId, currentProject, nodes]);

  const updateNode = useCallback(async (nodeId: string, updates: Partial<Pick<IdeaNode, "content" | "details" | "notes" | "color" | "position_x" | "position_y">>) => {
    await supabase.from("idea_nodes").update(updates as any).eq("id", nodeId);
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  }, []);

  const deleteNode = useCallback(async (nodeId: string) => {
    await supabase.from("idea_nodes").delete().eq("id", nodeId);
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.from_node_id !== nodeId && e.to_node_id !== nodeId));
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    await supabase.from("idea_projects").delete().eq("id", projectId);
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      setNodes([]);
      setEdges([]);
    }
    await loadProjects();
    toast.success("Project deleted");
  }, [currentProject, loadProjects]);

  const newProject = useCallback(() => {
    setCurrentProject(null);
    setNodes([]);
    setEdges([]);
  }, []);

  return {
    projects, currentProject, nodes, edges, isGenerating, userId,
    loadProjects, loadProject, generateIdeas, expandIdea, updateNode, deleteNode, deleteProject, newProject,
  };
}
