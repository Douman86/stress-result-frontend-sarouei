import { useEffect, useState } from "react";
import ResultsPage from "@/pages/results";

function getRid(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("rid") ?? params.get("result_id");
}

function App() {
  const [rid, setRid] = useState<string | null>(() => getRid());

  useEffect(() => {
    const onPop = () => setRid(getRid());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return <ResultsPage rid={rid} />;
}

export default App;
