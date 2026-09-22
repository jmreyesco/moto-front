import React, { useEffect, useState, useCallback } from "react";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export default function LeadsDashboard() {
  const [leads, setLeads] = useState([]);
  const [historicalLeads, setHistoricalLeads] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historicalError, setHistoricalError] = useState(null);
  const [filter, setFilter] = useState("CALIENTE");

  const [empresa, setEmpresa] = useState("");
  const [asesor, setAsesor] = useState("");

  // Cargar métricas aplicando los filtros activos
  const fetchMetrics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (empresa) params.append("empresa_id", empresa);
      if (asesor) params.append("asesor_id", asesor);

      const res = await fetch(`${API_BASE_URL}/metrics/summary?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error("Error cargando métricas:", e);
    }
  }, [empresa, asesor]);

  // Cargar listado de leads ordenados de mayor a menor similitud
  const fetchLeads = useCallback(async () => {
    if (filter === "GRAFICOS" || filter === "HISTORICO") return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (empresa) params.append("empresa_id", empresa);
      if (asesor) params.append("asesor_id", asesor);

      let endpoint = filter === "CALIENTE"
        ? `${API_BASE_URL}/leads/prioritarios`
        : `${API_BASE_URL}/leads`;

      if (filter !== "CALIENTE") {
        params.append("temperatura", filter);
      }

      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();

        // Ordenar estrictamente de mayor a menor grado de similitud
        const sortedData = [...data].sort(
          (a, b) => (b.score_similitud || 0) - (a.score_similitud || 0)
        );

        setLeads(sortedData);
      } else {
        setError("No se pudieron obtener los datos de la API.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor backend.");
    } finally {
      setLoading(false);
    }
  }, [filter, empresa, asesor]);

  // Cargar análisis RAG guardado
  const fetchHistoricalLeads = useCallback(async () => {
    setHistoricalLoading(true);
    setHistoricalError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (empresa) params.append("empresa_id", empresa);
      if (asesor) params.append("asesor_id", asesor);

      const response = await fetch(
        `${API_BASE_URL}/cierres-definitivos?${params.toString()}`
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(
          detail?.detail || "No se pudo obtener el análisis histórico."
        );
      }

      const data = await response.json();
      
      // Ordenar histórico de mayor a menor similitud también
      const sortedHistorical = [...data].sort(
        (a, b) => (b.similitud_historica || 0) - (a.similitud_historica || 0)
      );

      setHistoricalLeads(sortedHistorical);
    } catch (err) {
      setHistoricalError(
        err.message || "Error de conexión con el análisis histórico."
      );
    } finally {
      setHistoricalLoading(false);
    }
  }, [empresa, asesor]);

  useEffect(() => {
    fetchMetrics();
    fetchLeads();
    if (filter === "HISTORICO") {
      fetchHistoricalLeads();
    }
  }, [fetchMetrics, fetchLeads, fetchHistoricalLeads, filter]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/leads/${leadId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado_gestion: newStatus }),
      });

      if (response.ok) {
        setLeads((prev) =>
          prev.map((lead) =>
            lead.lead_id === leadId ? { ...lead, estado_gestion: newStatus } : lead
          )
        );
        fetchMetrics();
      }
    } catch (err) {
      alert("Error al actualizar el estado de la gestión");
    }
  };

  const getSimilitudStyle = (score) => {
    if (score >= 80)
      return {
        badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
        label: "Alta Coincidencia",
      };
    if (score >= 55)
      return {
        badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
        bar: "bg-gradient-to-r from-amber-500 to-yellow-400",
        label: "Coincidencia Media",
      };
    return {
      badge: "bg-slate-500/20 text-slate-400 border-slate-500/40",
      bar: "bg-gradient-to-r from-slate-500 to-gray-400",
      label: "Baja Coincidencia",
    };
  };

  const renderDonutChart = () => {
    if (!metrics || !metrics.temperaturas || metrics.total_leads === 0) return null;

    const { CALIENTE = 0, TIBIO = 0, FRIO = 0 } = metrics.temperaturas;
    const total = metrics.total_leads;

    const pCaliente = (CALIENTE / total) * 100;
    const pTibio = (TIBIO / total) * 100;
    const pFrio = (FRIO / total) * 100;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 bg-slate-800/80 border border-slate-700/60 p-6 rounded-xl shadow-lg h-full">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-700"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-blue-500"
              strokeWidth="4.5"
              strokeDasharray={`${pFrio} ${100 - pFrio}`}
              strokeDashoffset="0"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-amber-500"
              strokeWidth="4.5"
              strokeDasharray={`${pTibio} ${100 - pTibio}`}
              strokeDashoffset={-pFrio}
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-red-500"
              strokeWidth="4.5"
              strokeDasharray={`${pCaliente} ${100 - pCaliente}`}
              strokeDashoffset={-(pFrio + pTibio)}
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-3xl font-black text-white">{total}</span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-widest">
              Total Leads
            </span>
          </div>
        </div>

        <div className="space-y-4 w-full sm:w-auto">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Temperatura del Funnel
          </h4>
          <div className="flex items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
              <span className="text-slate-300 font-medium">Calientes</span>
            </div>
            <span className="font-bold text-white">
              {CALIENTE} ({Math.round(pCaliente)}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="text-slate-300 font-medium">Tibios</span>
            </div>
            <span className="font-bold text-white">
              {TIBIO} ({Math.round(pTibio)}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
              <span className="text-slate-300 font-medium">Fríos</span>
            </div>
            <span className="font-bold text-white">
              {FRIO} ({Math.round(pFrio)}%)
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderBrandChart = () => {
    const brandCounts =
      metrics?.marcas ||
      leads.reduce((acc, lead) => {
        const modelo = lead.modelo_interes || "Otro";
        const marca = modelo.split(" ")[0].toUpperCase();
        acc[marca] = (acc[marca] || 0) + 1;
        return acc;
      }, {});

    const totalCalculated = Object.values(brandCounts).reduce((a, b) => a + b, 0);
    if (totalCalculated === 0) return null;

    const sortedBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return (
      <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-xl shadow-lg space-y-4 h-full flex flex-col justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          🏍️ Marcas Más Solicitadas (Top 5)
        </h3>
        <div className="space-y-3.5 my-auto">
          {sortedBrands.map(([marca, count]) => {
            const percentage = Math.round((count / totalCalculated) * 100);
            return (
              <div key={marca} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-200">{marca}</span>
                  <span className="text-indigo-400">
                    {count} leads ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-700/60 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChannelChart = () => {
    const channelCounts = metrics?.canales || {};
    const totalCalculated = Object.values(channelCounts).reduce((a, b) => a + b, 0);
    if (totalCalculated === 0) return null;

    const sortedChannels = Object.entries(channelCounts).sort(([, a], [, b]) => b - a);

    return (
      <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-xl shadow-lg space-y-4 h-full flex flex-col justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span>📢</span> Canales de Contacto
        </h3>
        <div className="space-y-3.5 my-auto">
          {sortedChannels.map(([canal, count]) => {
            const percentage = Math.round((count / totalCalculated) * 100);
            return (
              <div key={canal} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-200">{canal}</span>
                  <span className="text-emerald-400">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-700/60 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
              <span>🎯</span> Matriz de Similitud de Éxito
            </h1>
            <p className="text-sm text-slate-400">
              Prospectos ordenados de mayor a menor probabilidad según patrones de venta cerrados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Todas las Empresas</option>
              <option value="EMP-01">EMP-01</option>
              <option value="EMP-02">EMP-02</option>
              <option value="EMP-03">EMP-03</option>
            </select>

            <select
              value={asesor}
              onChange={(e) => setAsesor(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Todos los Asesores</option>
              <option value="AS-021">AS-021</option>
              <option value="AS-022">AS-022</option>
              <option value="AS-023">AS-023</option>
            </select>

            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
              {["CALIENTE", "TIBIO", "FRIO", "GRAFICOS", "HISTORICO"].map((temp) => (
                <button
                  key={temp}
                  onClick={() => setFilter(temp)}
                  className={`px-4 py-2 rounded-md font-semibold text-xs transition-colors ${
                    filter === temp
                      ? temp === "CALIENTE"
                        ? "bg-red-600 text-white"
                        : temp === "TIBIO"
                          ? "bg-amber-600 text-white"
                          : temp === "FRIO"
                            ? "bg-blue-600 text-white"
                            : "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {temp === "GRAFICOS"
                    ? "📈 GRÁFICOS"
                    : temp === "HISTORICO"
                      ? "🧠 HISTÓRICO"
                      : temp}
                </button>
              ))}
            </div>
          </div>
        </header>

        {filter === "GRAFICOS" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {renderDonutChart()}
            {renderBrandChart()}
            {renderChannelChart()}
          </div>
        ) : filter === "HISTORICO" ? (
          historicalLoading ? (
            <div className="text-center py-10 text-slate-400">
              Cargando análisis histórico ordenado por similitud...
            </div>
          ) : historicalError ? (
            <div className="text-center py-10 text-red-400">
              {historicalError}
            </div>
          ) : historicalLeads.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              No hay análisis histórico disponible para los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {historicalLeads.map((lead, index) => {
                const scoreVal = Math.round((lead.similitud_historica || 0) * 100);
                const style = getSimilitudStyle(scoreVal);

                return (
                  <div
                    key={lead.lead_id}
                    className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block">
                            Ranking #{index + 1}
                          </span>
                          <h2 className="font-bold text-lg text-white">
                            {lead.nombre || "Sin Nombre"}
                          </h2>
                          <p className="text-xs text-slate-400">
                            {lead.telefono || "Sin teléfono"}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black border ${style.badge}`}
                        >
                          {scoreVal}% Similitud
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
                          <div
                            className={`h-full ${style.bar} transition-all duration-500`}
                            style={{ width: `${scoreVal}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 rounded-xl p-3 text-xs space-y-2 border border-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Modelo Interés:</span>
                          <span className="font-semibold text-white">
                            {lead.modelo_interes || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Tasa Éxito Histórica:</span>
                          <span className="font-semibold text-emerald-400">
                            {Math.round((lead.tasa_exito_historica || 0) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-indigo-950/40 border border-indigo-800/40 p-3 rounded-xl">
                        <p className="text-xs text-indigo-200 leading-relaxed">
                          💡 <span className="font-semibold">Recomendación RAG:</span>{" "}
                          {lead.recomendacion || "Sin recomendación registrada."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <>
            {loading ? (
              <div className="text-center py-10 text-slate-400">
                Cargando prospectos ordenados por grados de similitud...
              </div>
            ) : error ? (
              <div className="text-center py-10 text-red-400">{error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {leads.map((lead, index) => {
                  const scoreVal = Math.round(lead.score_similitud || 0);
                  const style = getSimilitudStyle(scoreVal);

                  return (
                    <div
                      key={lead.lead_id}
                      className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden flex flex-col justify-between hover:border-indigo-500/50 transition-all duration-300"
                    >
                      {/* Cabecera de Tarjeta */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block">
                              Posición #{index + 1}
                            </span>
                            <h2 className="font-bold text-lg text-white">
                              {lead.nombre || "Sin Nombre"}
                            </h2>
                            <p className="text-xs text-slate-400">
                              {lead.telefono || "Sin teléfono"}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black border ${style.badge}`}
                          >
                            {scoreVal}% Similitud
                          </span>
                        </div>

                        {/* Visualizador Principal de Similitud */}
                        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-700/60 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                              <span>✨</span> Grado de Coincidencia:
                            </span>
                            <span className="font-bold text-slate-200">
                              {style.label}
                            </span>
                          </div>

                          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
                            <div
                              className={`h-full ${style.bar} transition-all duration-500`}
                              style={{ width: `${scoreVal}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Detalles de Reglas y Perfil */}
                        <div className="bg-slate-900/50 rounded-xl p-3 text-xs space-y-2 border border-slate-800">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Modelo Solicitado:</span>
                            <span className="font-semibold text-slate-200">
                              {lead.modelo_interes || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Cuota Inicial:</span>
                            <span className="font-semibold text-emerald-400">
                              $
                              {Number(
                                lead.cuota_inicial_declarada || 0
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Score por Reglas:</span>
                            <span className="font-semibold text-slate-300">
                              {Math.round(lead.score_prioridad || 0)} pts
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Asesor Asignado:</span>
                            <span className="font-semibold text-indigo-400">
                              {lead.asesor_id || "Sin Asignar"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Control de Estado de Gestión */}
                      <div className="pt-2 border-t border-slate-700/50">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                          Estado de Gestión Commercial
                        </label>
                        <select
                          value={lead.estado_gestion || "NUEVO"}
                          onChange={(e) =>
                            handleStatusChange(lead.lead_id, e.target.value)
                          }
                          className="w-full bg-slate-700/80 border border-slate-600 text-white text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="NUEVO">NUEVO</option>
                          <option value="ASIGNADO">ASIGNADO</option>
                          <option value="CONTACTADO">CONTACTADO</option>
                          <option value="EN_NEGOCIACION">EN NEGOCIACIÓN</option>
                          <option value="VENDIDO">VENDIDO</option>
                          <option value="DESCARTADO">DESCARTADO</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}