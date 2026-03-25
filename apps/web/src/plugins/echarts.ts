import { use } from "echarts/core";

// Renderers (elige 1, canvas es lo más común)
import { CanvasRenderer } from "echarts/renderers";

// Charts que usas
import { BarChart, LineChart, PieChart } from "echarts/charts";

// Componentes que usas
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  GraphicComponent,
} from "echarts/components";

// Registrar todo lo necesario
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  GraphicComponent,
]);