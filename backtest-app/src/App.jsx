import React, { useState, useEffect } from 'react';
import { 
  getSymbolsAPI, 
  getLotSize, 
  getTechnicalParam,
  getDefaultStrategies,
  submitBacktesting,
  buildBacktestPayload
} from './services/api';
import BacktestResults from './components/BacktestResults (8)';

function App() {
  const mapIndicatorToApi = (label) => {
    const map = {
      "EMA": "EMA",
      "EMA High": "EMA High",
      "EMA Low": "EMA Low",
      "SMA": "SMA",
      "MACD": "MACD",
      "MACD Signal": "MACD Signal",
      "Super Trend": "Super Trend",
      "Parabolic SAR": "Parabolic SAR",
      "Bollinger Band Middle": "Bollinger Band Middle",
      "Bollinger Band Upper": "Bollinger Band Upper",
      "Bollinger Band Lower": "Bollinger Band Lower",
      "Close": "close",
      "Open": "open",
      "High": "high",
      "Low": "low"
    };
    return map[label] || label.toLowerCase().replace(/\s+/g, " ");
  };

  const extractDynamicFields = (item) => {
    const fields = [];
    let index = 1;
    while (item[`a_label${index}`]) {
      fields.push({
        label: item[`a_label${index}`],
        defaultValue: item[`a_value${index}`] || 1
      });
      index++;
    }
    return fields;
  };

  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [lotSize, setLotSize] = useState(65);
  const [validity, setValidity] = useState('Intraday');
  const [expiryType, setExpiryType] = useState('Weekly');
  const [showConfig, setShowConfig] = useState(false);
  
  const [entryConditions, setEntryConditions] = useState([]);
  const [exitConditions, setExitConditions] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [showExitSection, setShowExitSection] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);

  const [greeting, setGreeting] = useState("");
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "🌅 Good Morning!";
    else if (hour < 17) return "☀️ Good Afternoon!";
    else if (hour < 23) return "🌆 Good Evening!";
    else return "🌙 Good Night!";
  };
  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  const [trades, setTrades] = useState([{
    id: 1,
    buySell: 'BUY',
    instrument: 'CE',
    atm: 'ATM',
    qty: 65,
    type: 'Pts',
    target: 0,
    stoploss: 0
  }]);

  const [exitTrades, setExitTrades] = useState([]);

  const [noOfTimes, setNoOfTimes] = useState(0);
  const [startTime, setStartTime] = useState('09:15');
  const [endTime, setEndTime] = useState('15:30');
  const [selectedDays, setSelectedDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  
  const [targetType, setTargetType] = useState('₹');
  const [fixedProfit, setFixedProfit] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  
  const [timePeriod, setTimePeriod] = useState('Custom');
  const [fromDate, setFromDate] = useState('2026-01-30');
  const [toDate, setToDate] = useState('2026-02-06');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [defaultStrategies, setDefaultStrategies] = useState(null);

  const [technicalParamsLeft, setTechnicalParamsLeft] = useState(null);
  const [apiError, setApiError] = useState({ left: false, entry: false, exit: false });

  const [entryIndicator, setEntryIndicator] = useState('');
  const [entryMeta, setEntryMeta] = useState(null);
  const [entryParams, setEntryParams] = useState({});
  const [entryOperator, setEntryOperator] = useState('');
  const [entryFunction, setEntryFunction] = useState('');
  const [entryFunctionParams, setEntryFunctionParams] = useState({});
  const [entryLogic, setEntryLogic] = useState('AND');

  const [exitIndicator, setExitIndicator] = useState('');
  const [exitMeta, setExitMeta] = useState(null);
  const [exitParams, setExitParams] = useState({});
  const [exitOperator, setExitOperator] = useState('');
  const [exitFunction, setExitFunction] = useState('');
  const [exitFunctionParams, setExitFunctionParams] = useState({});
  const [exitLogic, setExitLogic] = useState('AND');

  const quickConfigs = [
    { name: 'EMA CrossOver', strategy: 'EMA_CrossOver' },
    { name: 'SuperTrend', strategy: 'SuperTrend' },
    { name: 'Parabolic SAR', strategy: 'Parabolic_SAR' },
    { name: 'BBands BreakOut', strategy: 'BBands_BreakOut' },
    { name: 'MACD Crosssover', strategy: 'MACD_Crossover' }
  ];

  useEffect(() => {
    if (selectedSymbol) {
      const size = getLotSize(selectedSymbol);
      setLotSize(size);
      setTrades(trades.map(t => ({ ...t, qty: size })));
      if (exitTrades.length > 0) {
        setExitTrades(exitTrades.map(t => ({ ...t, qty: size })));
      }
    }
  }, [selectedSymbol]);

  useEffect(() => {
    loadTechnicalParamsLeft();
    loadDefaultStrategies();
  }, []);

  const loadDefaultStrategies = async () => {
    try {
      const res = await getDefaultStrategies();
      if (!res) throw new Error("Invalid default strategy response");
      setDefaultStrategies(res);
    } catch (error) {
      console.error("❌ Failed to load default strategies:", error);
    }
  };

  const loadTechnicalParamsLeft = async () => {
    try {
      const res = await getTechnicalParam('close');
      if (!res || (!res.Before && !res.After && !res.data)) throw new Error('Invalid response structure from API');
      setTechnicalParamsLeft(res);
      setApiError(prev => ({ ...prev, left: false }));
    } catch (error) {
      console.error('❌ Failed to load Left Technical Parameters:', error);
      setApiError(prev => ({ ...prev, left: true }));
      setMessage({ type: 'error', text: 'Failed to load technical parameters. Please check API connection.' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const loadTechnicalParams = async (indicatorValue, type = "entry") => {
    try {
      const res = await getTechnicalParam(indicatorValue || "close");
      if (!res) throw new Error("Invalid API response");

      if (type === "entry") {
        setEntryMeta(res);
        const initialParams = {};
        if (res.Before && res.Before.length > 0) {
          const fields = extractDynamicFields(res.Before[0]);
          fields.forEach(field => { initialParams[field.label] = Number(field.defaultValue); });
        }
        setEntryParams(initialParams);
        setEntryFunction('');
        setApiError(prev => ({ ...prev, entry: false }));
        if (res.After && res.After.length > 0) {
          setEntryFunction(res.After[0].Name);
          const initialFunctionParams = {};
          const functionFields = extractDynamicFields(res.After[0]);
          functionFields.forEach(field => { initialFunctionParams[field.label] = Number(field.defaultValue); });
          setEntryFunctionParams(initialFunctionParams);
        }
      } else {
        setExitMeta(res);
        const initialParams = {};
        if (res.Before && res.Before.length > 0) {
          const fields = extractDynamicFields(res.Before[0]);
          fields.forEach(field => { initialParams[field.label] = Number(field.defaultValue); });
        }
        setExitParams(initialParams);
        setExitFunction('');
        setApiError(prev => ({ ...prev, exit: false }));
        if (res.After && res.After.length > 0) {
          setExitFunction(res.After[0].Name);
          const initialFunctionParams = {};
          const functionFields = extractDynamicFields(res.After[0]);
          functionFields.forEach(field => { initialFunctionParams[field.label] = Number(field.defaultValue); });
          setExitFunctionParams(initialFunctionParams);
        }
      }
    } catch (error) {
      console.error(`❌ ${type} parameter load failed:`, error);
      if (type === "entry") { setEntryMeta(null); setApiError(prev => ({ ...prev, entry: true })); }
      else { setExitMeta(null); setApiError(prev => ({ ...prev, exit: true })); }
    }
  };

  const handleQuickConfig = async (config) => {
    try {
      setIsLoading(true);
      const response = await getDefaultStrategies();
      const strategyList = response?.List || [];
      const selected = strategyList.find(s => s.StrategyName === config.name);
      if (!selected) throw new Error("Strategy not found");
      setSelectedStrategy(selected.StrategyName);

      const defaultEntryOperators = {
        'EMA CrossOver': 'Crosses Above', 'SuperTrend': 'Greater Than ( > )',
        'Parabolic SAR': 'Lesser Than ( < )', 'BBands BreakOut': 'Greater Than ( > )',
        'MACD Crosssover': 'Greater Than ( > )'
      };
      const defaultExitOperators = {
        'EMA CrossOver': 'Crosses Below', 'SuperTrend': 'Lesser Than ( < )',
        'Parabolic SAR': 'Greater Than ( > )', 'BBands BreakOut': 'Lesser Than ( < )',
        'MACD Crosssover': 'Lesser Than ( < )'
      };

      if (selected.EntryTechnicals && selected.EntryTechnicals.length > 0) {
        const entryTechnical = selected.EntryTechnicals[0];
        const values = entryTechnical.value.split(',');
        if (values.length >= 6) {
          const indicatorName = values[0];
          const period1 = values[1];
          const operator = values[2];
          const functionName = values[3];
          const period2 = values[4];
          const logic = values[5];
          setEntryIndicator(indicatorName);
          await loadTechnicalParams(mapIndicatorToApi(indicatorName), "entry");
          setTimeout(() => {
            setEntryParams({ Period: Number(period1) });
            setEntryOperator(defaultEntryOperators[selected.StrategyName] || operator);
            setEntryFunction(functionName);
            setEntryFunctionParams({ Period: Number(period2) });
            setEntryLogic(logic);
          }, 100);
          setExitIndicator(indicatorName);
          await loadTechnicalParams(mapIndicatorToApi(indicatorName), "exit");
          setTimeout(() => {
            setExitParams({ Period: Number(period1) });
            setExitOperator(defaultExitOperators[selected.StrategyName] || getOppositeOperator(operator));
            setExitFunction(functionName);
            setExitFunctionParams({ Period: Number(period2) });
            setExitLogic(logic);
          }, 150);
        }
      } else {
        let indicatorToLoad = '';
        switch(config.strategy) {
          case 'EMA_CrossOver': indicatorToLoad = 'EMA'; break;
          case 'SuperTrend': indicatorToLoad = 'Close'; break;
          case 'Parabolic_SAR': indicatorToLoad = 'Parabolic SAR'; break;
          case 'BBands_BreakOut': indicatorToLoad = 'Close'; break;
          case 'MACD_Crossover': indicatorToLoad = 'MACD'; break;
          default: indicatorToLoad = 'Close';
        }
        setEntryIndicator(indicatorToLoad);
        await loadTechnicalParams(mapIndicatorToApi(indicatorToLoad), "entry");
        setTimeout(() => { setEntryOperator(defaultEntryOperators[selected.StrategyName] || ''); }, 100);
        setExitIndicator(indicatorToLoad);
        await loadTechnicalParams(mapIndicatorToApi(indicatorToLoad), "exit");
        setTimeout(() => { setExitOperator(defaultExitOperators[selected.StrategyName] || ''); }, 150);
      }

      setShowConfig(true);
      setMessage({ type: "success", text: `${selected.StrategyName} strategy loaded successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Failed to load strategy" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getOppositeOperator = (operator) => {
    const opposites = {
      'Greater Than ( > )': 'Lesser Than ( < )', 'Lesser Than ( < )': 'Greater Than ( > )',
      'Greater Than/Equal ( >= )': 'Lesser Than/Equal ( <= )', 'Lesser Than/Equal ( <= )': 'Greater Than/Equal ( >= )',
      'Crosses Above': 'Crosses Below', 'Crosses Below': 'Crosses Above', 'Equals ( = )': 'Equals ( = )'
    };
    return opposites[operator] || operator;
  };

  const handleEntryFunctionChange = (functionName) => {
    setEntryFunction(functionName);
    const selectedFunction = entryMeta?.After?.find(fn => fn.Name === functionName);
    if (selectedFunction) {
      const initialFunctionParams = {};
      const functionFields = extractDynamicFields(selectedFunction);
      functionFields.forEach(field => { initialFunctionParams[field.label] = Number(field.defaultValue); });
      setEntryFunctionParams(initialFunctionParams);
    }
  };

  const handleExitFunctionChange = (functionName) => {
    setExitFunction(functionName);
    const selectedFunction = exitMeta?.After?.find(fn => fn.Name === functionName);
    if (selectedFunction) {
      const initialFunctionParams = {};
      const functionFields = extractDynamicFields(selectedFunction);
      functionFields.forEach(field => { initialFunctionParams[field.label] = Number(field.defaultValue); });
      setExitFunctionParams(initialFunctionParams);
    }
  };

  const handleSymbolChange = (e) => {
    const newSymbol = e.target.value;
    setSelectedSymbol(newSymbol);
    const newInstrument = (newSymbol === 'NIFTY' || newSymbol === 'BANKNIFTY') ? 'CE' : 'EQ';
    setTrades(trades.map(t => ({ ...t, instrument: newInstrument })));
    if (exitTrades.length > 0) setExitTrades(exitTrades.map(t => ({ ...t, instrument: newInstrument })));
  };

  const handleAddTrade = () => {
    setTrades([...trades, { id: Date.now(), buySell: 'BUY', instrument: getInstrumentOptions()[0], atm: 'ATM', qty: lotSize, type: 'Pts', target: 0, stoploss: 0 }]);
  };

  const handleRemoveTrade = (tradeId) => {
    if (trades.length > 1) setTrades(trades.filter(t => t.id !== tradeId));
  };

  const handleAddExitTrade = () => {
    setExitTrades([...exitTrades, { id: Date.now(), buySell: 'SELL', instrument: getInstrumentOptions()[0], atm: 'ATM', qty: lotSize, type: 'Pts', target: 0, stoploss: 0 }]);
    setShowExitSection(true);
  };

  const handleRemoveExitTrade = (tradeId) => {
    const updatedExitTrades = exitTrades.filter(t => t.id !== tradeId);
    setExitTrades(updatedExitTrades);
    if (updatedExitTrades.length === 0) setShowExitSection(false);
  };

  const adjustQuantity = (tradeId, increment, isExitTrade = false) => {
    const updateFunction = (trade) => {
      if (trade.id === tradeId) {
        const newQty = increment ? trade.qty + lotSize : Math.max(lotSize, trade.qty - lotSize);
        return { ...trade, qty: newQty };
      }
      return trade;
    };
    if (isExitTrade) setExitTrades(exitTrades.map(updateFunction));
    else setTrades(trades.map(updateFunction));
  };

  const getInstrumentOptions = () => {
    if (selectedSymbol === 'NIFTY' || selectedSymbol === 'BANKNIFTY') return ['CE', 'PE', 'FUT'];
    return ['EQ', 'FUT', 'CE', 'PE'];
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) setSelectedDays(selectedDays.filter(d => d !== day));
    else setSelectedDays([...selectedDays, day]);
  };

  const handleAddEntryCondition = () => {
    const values = [entryIndicator, ...Object.values(entryParams), entryOperator, entryFunction, ...Object.values(entryFunctionParams), entryLogic];
    setEntryConditions([...entryConditions, { value: values.join(",") }]);
  };

  const handleAddExitCondition = () => {
    const values = [exitIndicator, ...Object.values(exitParams), exitOperator, exitFunction, ...Object.values(exitFunctionParams), exitLogic];
    setExitConditions([...exitConditions, { value: values.join(",") }]);
  };

  const handleRemoveEntryCondition = (index) => setEntryConditions(prev => prev.filter((_, i) => i !== index));
  const handleRemoveExitCondition = (index) => setExitConditions(prev => prev.filter((_, i) => i !== index));

  const validateForm = () => {
    if (!selectedSymbol) { setMessage({ type: 'error', text: 'Please select a symbol' }); return false; }
    if (trades.length === 0) { setMessage({ type: 'error', text: 'Please add at least one entry trade' }); return false; }
    if (selectedDays.length === 0) { setMessage({ type: 'error', text: 'Please select at least one trading day' }); return false; }
    if (new Date(fromDate) > new Date(toDate)) { setMessage({ type: 'error', text: 'From date cannot be after To date' }); return false; }
    if (entryConditions.length === 0) { setMessage({ type: 'error', text: 'Please add at least one entry technical condition' }); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) { setTimeout(() => setMessage(null), 3000); return; }
    setIsLoading(true);
    try {
      const payload = buildBacktestPayload({
        symbol: selectedSymbol, validity, expiryType, timeFrame: '5',
        exchange: (selectedSymbol === 'NIFTY' || selectedSymbol === 'BANKNIFTY') ? 'NFO' : 'NSE',
        entryParameters: trades.map(t => ({ Symbol: selectedSymbol, Instrument: t.instrument, BuySell: t.buySell, Qty: String(t.qty), StrikeType: t.atm, Type: t.type, Tgt: String(t.target), SL: String(t.stoploss), TrailTGT: "0", TrailSL: "0" })),
        entryParametersReverse: trades.map(t => ({ Symbol: selectedSymbol, Instrument: t.instrument, BuySell: t.buySell === 'BUY' ? 'SELL' : 'BUY', Qty: String(t.qty), StrikeType: t.atm, Type: t.type, Tgt: String(t.target), SL: String(t.stoploss), TrailTGT: "0", TrailSL: "0" })),
        technicalParameters: entryConditions.map(c => ({ value: c.value, TimeFrame: "5" })),
        technicalParametersExit: exitConditions.map(c => ({ value: c.value, TimeFrame: "5" })),
        targetParameters: [{ FixedProfit: String(fixedProfit), Type: targetType === '₹' ? 'Value' : '%' }],
        exitParameters: [{ FixedLoss: String(stopLoss) }],
        dailyParameters: [{ Monday: selectedDays.includes('Monday') ? 'True' : 'False', Tuesday: selectedDays.includes('Tuesday') ? 'True' : 'False', Wednesday: selectedDays.includes('Wednesday') ? 'True' : 'False', Thursday: selectedDays.includes('Thursday') ? 'True' : 'False', Friday: selectedDays.includes('Friday') ? 'True' : 'False', TimeFrame: 'Weekly' }],
        computationTime: [{ EntryTime: startTime, ExitTime: endTime, nooftimes: String(noOfTimes) }],
        backTestParameters: [{ fromdate: fromDate, todate: toDate }]
      });
      const response = await submitBacktesting(payload);
      setBacktestResult(response);
      setMessage({ type: 'success', text: 'Backtesting submitted successfully!' });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit backtesting. API is not responding.' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLeftIndicatorOptions = () => {
    if (apiError.left) return <option value="">⚠️ API Error</option>;
    let indicatorList = defaultStrategies?.Indicators;
    if (!indicatorList || !indicatorList.length) {
      indicatorList = [
        { Name: "ADX" }, { Name: "Aroon Oscillator" }, { Name: "ATR" },
        { Name: "Bollinger Band Lower" }, { Name: "Bollinger Band Middle" }, { Name: "Bollinger Band Upper" },
        { Name: "CCI" }, { Name: "Close" }, { Name: "Day High" }, { Name: "Day Low" }, { Name: "Day Open" },
        { Name: "DI Minus" }, { Name: "DI Plus" }, { Name: "EMA" }, { Name: "EMA High" }, { Name: "EMA Low" },
        { Name: "High" }, { Name: "Low" }, { Name: "MACD" }, { Name: "MACD Signal" }, { Name: "Momentum" },
        { Name: "Money Flow Index" }, { Name: "Open" }, { Name: "Parabolic SAR" }, { Name: "RSI" }, { Name: "Super Trend" }
      ];
    }
    return (
      <>
        <option value="">Select Indicator</option>
        {indicatorList.map((item, idx) => <option key={idx} value={item.Name}>{item.Name}</option>)}
      </>
    );
  };

  const renderOperatorOptions = () => {
    if (apiError.left) return <option value="">⚠️ API Error</option>;
    if (!technicalParamsLeft) return <option value="">Loading...</option>;
    let operatorList = technicalParamsLeft?.Operators;
    if (!operatorList || !operatorList.length) {
      operatorList = [
        { Name: "Greater Than ( > )" }, { Name: "Lesser Than ( < )" }, { Name: "Equals ( = )" },
        { Name: "Greater Than/Equal ( >= )" }, { Name: "Lesser Than/Equal ( <= )" },
        { Name: "Crosses Above" }, { Name: "Crosses Below" }
      ];
    }
    return (
      <>
        <option value="">Select Operator</option>
        {operatorList.map((item, idx) => <option key={idx} value={item.Name}>{item.Name}</option>)}
      </>
    );
  };

  const symbols = getSymbolsAPI();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayAbbreviations = ['M', 'T', 'W', 'T', 'F'];

  const Stepper = ({ value, setValue, label = "" }) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-600 font-medium">{label}</label>}
      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden h-9">
        <button type="button" onClick={() => setValue(Math.max(1, value - 1))} className="px-2.5 border-none bg-gray-100 hover:bg-gray-200 transition-colors">−</button>
        <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-16 border-none text-center focus:outline-none" />
        <button type="button" onClick={() => setValue(value + 1)} className="px-2.5 border-none bg-gray-100 hover:bg-gray-200 transition-colors">+</button>
      </div>
    </div>
  );

  const renderEntryFields = () => {
    const dynamicFields = entryMeta?.Before?.length > 0 ? extractDynamicFields(entryMeta.Before[0]) : [];
    const selectedFunction = entryMeta?.After?.find(fn => fn.Name === entryFunction);
    const functionFields = selectedFunction ? extractDynamicFields(selectedFunction) : [];
    return (
      <>
        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full sm:w-auto sm:min-w-[180px] transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={entryIndicator} onChange={(e) => { const value = e.target.value; setEntryIndicator(value); loadTechnicalParams(mapIndicatorToApi(value), "entry"); }} disabled={apiError.left}>{renderLeftIndicatorOptions()}</select>
        {dynamicFields.map((field, idx) => (<Stepper key={idx} label={field.label} value={entryParams[field.label] || Number(field.defaultValue)} setValue={(val) => setEntryParams(prev => ({ ...prev, [field.label]: val }))} />))}
        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full sm:w-auto sm:min-w-[180px] transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={entryOperator} onChange={(e) => setEntryOperator(e.target.value)}>{renderOperatorOptions()}</select>
        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full sm:w-auto sm:min-w-[180px] transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={entryFunction} onChange={(e) => handleEntryFunctionChange(e.target.value)}>
          <option value="">Select Function</option>
          {entryMeta?.After?.map((fn, idx) => <option key={idx} value={fn.Name}>{fn.Name}</option>)}
        </select>
        {functionFields.map((field, idx) => (<Stepper key={`func-${idx}`} label={field.label} value={entryFunctionParams[field.label] || Number(field.defaultValue)} setValue={(val) => setEntryFunctionParams(prev => ({ ...prev, [field.label]: val }))} />))}
        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full sm:w-auto sm:min-w-[180px] transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={entryLogic} onChange={(e) => setEntryLogic(e.target.value)}>
          <option value="AND">AND</option><option value="OR">OR</option>
        </select>
        <button className="px-4 py-2 bg-indigo-600 text-white border-none rounded-md text-sm font-semibold cursor-pointer transition-all hover:bg-indigo-700 w-full sm:w-auto" onClick={handleAddEntryCondition}>+ ADD</button>
      </>
    );
  };

  const renderExitFields = () => {
    const dynamicFields = exitMeta?.Before?.length > 0 ? extractDynamicFields(exitMeta.Before[0]) : [];
    const selectedFunction = exitMeta?.After?.find(fn => fn.Name === exitFunction);
    const functionFields = selectedFunction ? extractDynamicFields(selectedFunction) : [];
    return (
      <>
        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full sm:w-auto sm:min-w-[180px] transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={exitIndicator} onChange={(e) => { const value = e.target.value; setExitIndicator(value); loadTechnicalParams(mapIndicatorToApi(value), "exit"); }} disabled={apiError.left}>{renderLeftIndicatorOptions()}</select>
        {dynamicFields.map((field, idx) => (<Stepper key={idx} label={field.label} value={exitParams[field.label] || Number(field.defaultValue)} setValue={(val) => setExitParams(prev => ({ ...prev, [field.label]: val }))} />))}
        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full sm:w-auto sm:min-w-[180px] transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={exitOperator} onChange={(e) => setExitOperator(e.target.value)}>{renderOperatorOptions()}</select>
        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full sm:w-auto sm:min-w-[180px] transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={exitFunction} onChange={(e) => handleExitFunctionChange(e.target.value)}>
          <option value="">Select Function</option>
          {exitMeta?.After?.map((fn, idx) => <option key={idx} value={fn.Name}>{fn.Name}</option>)}
        </select>
        {functionFields.map((field, idx) => (<Stepper key={`func-${idx}`} label={field.label} value={exitFunctionParams[field.label] || Number(field.defaultValue)} setValue={(val) => setExitFunctionParams(prev => ({ ...prev, [field.label]: val }))} />))}
        <select className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-full sm:w-auto sm:min-w-[180px] transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={exitLogic} onChange={(e) => setExitLogic(e.target.value)}>
          <option value="AND">AND</option><option value="OR">OR</option>
        </select>
        <button className="px-4 py-2 bg-indigo-600 text-white border-none rounded-md text-sm font-semibold cursor-pointer transition-all hover:bg-indigo-700 w-full sm:w-auto" onClick={handleAddExitCondition}>+ ADD</button>
      </>
    );
  };

  // Trade row component for entry/exit tables
  const TradeRow = ({ trade, isExit = false }) => (
    <div className="flex flex-col sm:grid sm:grid-cols-[100px_120px_120px_170px_100px_120px_120px_80px] min-w-0 sm:min-w-[930px] border-b border-gray-200 hover:bg-gray-50 p-3 sm:p-0 gap-3 sm:gap-0">
      {/* Mobile label + content layout */}
      <div className="flex flex-wrap gap-3 sm:contents">
        {/* Buy/Sell */}
        <div className="flex flex-col gap-1 sm:contents">
          <span className="text-xs text-gray-500 font-medium sm:hidden">Buy/Sell</span>
          <div className="sm:p-4 sm:flex sm:items-center">
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button
                className={`w-9 h-9 border-none text-xs font-bold cursor-pointer transition-all ${trade.buySell === 'BUY' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => isExit ? setExitTrades(exitTrades.map(t => t.id === trade.id ? {...t, buySell: 'BUY'} : t)) : setTrades(trades.map(t => t.id === trade.id ? {...t, buySell: 'BUY'} : t))}
              >B</button>
              <button
                className={`w-9 h-9 border-none text-xs font-bold cursor-pointer transition-all ${trade.buySell === 'SELL' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => isExit ? setExitTrades(exitTrades.map(t => t.id === trade.id ? {...t, buySell: 'SELL'} : t)) : setTrades(trades.map(t => t.id === trade.id ? {...t, buySell: 'SELL'} : t))}
              >S</button>
            </div>
          </div>
        </div>
        {/* Instrument */}
        <div className="flex flex-col gap-1 sm:contents">
          <span className="text-xs text-gray-500 font-medium sm:hidden">Instrument</span>
          <div className="sm:p-4 sm:flex sm:items-center">
            <select
              value={trade.instrument}
              onChange={(e) => isExit ? setExitTrades(exitTrades.map(t => t.id === trade.id ? {...t, instrument: e.target.value} : t)) : setTrades(trades.map(t => t.id === trade.id ? {...t, instrument: e.target.value} : t))}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm w-full bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {getInstrumentOptions().map(inst => <option key={inst} value={inst}>{inst}</option>)}
            </select>
          </div>
        </div>
        {/* ATM */}
        <div className="flex flex-col gap-1 sm:contents">
          <span className="text-xs text-gray-500 font-medium sm:hidden">ATM</span>
          <div className="sm:p-4 sm:flex sm:items-center">
            <select
              value={trade.atm}
              onChange={(e) => isExit ? setExitTrades(exitTrades.map(t => t.id === trade.id ? {...t, atm: e.target.value} : t)) : setTrades(trades.map(t => t.id === trade.id ? {...t, atm: e.target.value} : t))}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm w-full bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="ATM">ATM</option><option value="ITM">ITM</option><option value="OTM">OTM</option>
            </select>
          </div>
        </div>
        {/* Lots */}
        <div className="flex flex-col gap-1 sm:contents">
          <span className="text-xs text-gray-500 font-medium sm:hidden">Lots</span>
          <div className="sm:p-4 sm:flex sm:items-center">
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden min-w-[140px] h-9">
              <button type="button" className="w-9 h-full border-none bg-gray-100 hover:bg-gray-200 text-base cursor-pointer transition-colors" onClick={() => adjustQuantity(trade.id, false, isExit)}>−</button>
              <input type="number" value={trade.qty} readOnly className="flex-1 border-none text-center text-sm font-medium min-w-[40px] max-w-[70px] focus:outline-none" />
              <button type="button" className="w-9 h-full border-none bg-gray-100 hover:bg-gray-200 text-base cursor-pointer transition-colors" onClick={() => adjustQuantity(trade.id, true, isExit)}>+</button>
            </div>
          </div>
        </div>
        {/* Type */}
        <div className="flex flex-col gap-1 sm:contents">
          <span className="text-xs text-gray-500 font-medium sm:hidden">Type</span>
          <div className="sm:p-4 sm:flex sm:items-center">
            <select
              value={trade.type}
              onChange={(e) => isExit ? setExitTrades(exitTrades.map(t => t.id === trade.id ? {...t, type: e.target.value} : t)) : setTrades(trades.map(t => t.id === trade.id ? {...t, type: e.target.value} : t))}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm w-full bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="Pts">Pts</option><option value="%">%</option>
            </select>
          </div>
        </div>
        {/* Target */}
        <div className="flex flex-col gap-1 sm:contents">
          <span className="text-xs text-gray-500 font-medium sm:hidden">Target</span>
          <div className="sm:p-4 sm:flex sm:items-center">
            <input
              type="number"
              value={trade.target}
              onChange={(e) => isExit ? setExitTrades(exitTrades.map(t => t.id === trade.id ? {...t, target: Number(e.target.value)} : t)) : setTrades(trades.map(t => t.id === trade.id ? {...t, target: Number(e.target.value)} : t))}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
        {/* Stoploss */}
        <div className="flex flex-col gap-1 sm:contents">
          <span className="text-xs text-gray-500 font-medium sm:hidden">Stoploss</span>
          <div className="sm:p-4 sm:flex sm:items-center">
            <input
              type="number"
              value={trade.stoploss}
              onChange={(e) => isExit ? setExitTrades(exitTrades.map(t => t.id === trade.id ? {...t, stoploss: Number(e.target.value)} : t)) : setTrades(trades.map(t => t.id === trade.id ? {...t, stoploss: Number(e.target.value)} : t))}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
        {/* Actions */}
        <div className="sm:p-4 sm:flex sm:items-center">
          {(!isExit ? trades.length > 1 : true) && (
            <button
              onClick={() => isExit ? handleRemoveExitTrade(trade.id) : handleRemoveTrade(trade.id)}
              className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 font-bold cursor-pointer border-none transition-all flex items-center justify-center"
              title="Delete trade"
            >✕</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-800">

      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm sm:text-lg font-semibold truncate">{greeting}</span>
              <span className="text-xs text-slate-500 hidden sm:block">Welcome back – Strategy Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
            <span className="text-xs sm:text-sm text-slate-600 hidden sm:flex items-center">
              Subscription
              <span className="ml-2 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-sm">Active</span>
            </span>
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow text-sm sm:text-base">S</div>
              <div className="flex-col leading-tight hidden sm:flex">
                <div className="font-semibold text-sm">Sai Santhosh</div>
                <div className="text-xs text-slate-500">Broker: BNRATHI</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white px-4 sm:px-8 py-3 border-b border-gray-200 text-sm text-gray-600">
        <span>🏠</span>
        <span className="mx-2 text-gray-400">›</span>
        <span>Back-Testing</span>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">

        {/* Symbol + Validity */}
        <div className="bg-[#F7F9FC] border border-[#E3E8F2] p-4 sm:p-8 rounded-xl shadow-sm mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:min-w-[250px]">
            <div className="relative flex items-center bg-white border-[1.5px] border-gray-300 rounded-xl px-4 py-2.5 w-full sm:min-w-[320px] sm:max-w-[420px] transition-all shadow-sm hover:border-gray-400 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-100">
              <span className="mr-2.5 text-base text-gray-500">🔍</span>
              <input
                type="text"
                placeholder="Search symbol (e.g. NIFTY, BANKNIFTY)"
                className="flex-1 border-none outline-none text-[0.95rem] font-semibold text-gray-700 bg-transparent placeholder:text-gray-400 placeholder:font-medium"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                list="symbol-list"
              />
              <datalist id="symbol-list">
                {symbols.map(s => <option key={s.symbol} value={s.symbol} />)}
              </datalist>
            </div>
            <div className="mt-3 text-sm text-gray-600 font-medium">Lot Size: {lotSize}</div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              className={`flex-1 sm:flex-none px-6 sm:px-8 py-3 rounded-lg font-semibold cursor-pointer transition-all text-sm ${validity === 'Intraday' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setValidity('Intraday')}
            >Intraday</button>
            <button
              className={`flex-1 sm:flex-none px-6 sm:px-8 py-3 rounded-lg font-semibold cursor-pointer transition-all text-sm ${validity === 'Positional' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setValidity('Positional')}
            >Positional</button>
          </div>
        </div>

        {/* Quick Configurations */}
        <div className="bg-[#FAFBFD] border border-[#E6ECF5] p-4 sm:p-8 rounded-xl shadow-sm mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg mb-4 sm:mb-6 text-gray-700 font-semibold">⚡ Quick Configurations</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {quickConfigs.map((config, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-6 border-2 border-gray-300 rounded-xl text-center cursor-pointer transition-all bg-white hover:border-indigo-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-100"
                onClick={() => handleQuickConfig(config)}
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📊</div>
                <div className="font-semibold text-xs sm:text-sm text-gray-700">{config.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Form */}
        {!showConfig ? (
          <div className="bg-gradient-to-br from-teal-50 to-green-50 py-12 sm:py-16 px-4 sm:px-8 rounded-xl text-center mb-6 sm:mb-8">
            <div className="text-5xl text-green-600 mb-4 font-light">+</div>
            <h2 className="text-xl sm:text-2xl mb-3 text-gray-700 font-semibold">Let's Get Started!</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-sm sm:text-base">Configure Your Entry And Exit Indicators To Prepare Your Strategy For Backtesting.</p>
            <button
              className="bg-green-500 text-white border-none px-8 py-3 rounded-lg font-semibold cursor-pointer text-base transition-all hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-200"
              onClick={() => setShowConfig(true)}
            >Start Configuration</button>
          </div>
        ) : (
          <>
            {/* API Error Banner */}
            {(apiError.left || apiError.entry || apiError.exit) && (
              <div className="bg-red-50 border border-red-400 p-4 rounded-lg mb-6 sm:mb-8 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">⚠️</span>
                <div>
                  <strong className="text-red-900">API Connection Error</strong>
                  <p className="mt-1 text-red-800 text-sm">Some technical parameters could not be loaded. Please check your API connection and try refreshing the page.</p>
                  <button onClick={loadTechnicalParamsLeft} className="mt-2 px-3 py-1.5 bg-red-600 text-white border-none rounded cursor-pointer text-xs hover:bg-red-700 transition-colors">🔄 Retry Loading</button>
                </div>
              </div>
            )}

            {/* Entry When */}
            <div className="bg-white border border-slate-200 p-4 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <h3 className="text-base sm:text-lg text-gray-700 font-semibold">
                  📈 Entry When{' '}
                  <span className="inline-block w-[18px] h-[18px] rounded-full bg-gray-600 text-white text-[11px] text-center leading-[18px] ml-1.5 cursor-pointer" title="Entry conditions information">ⓘ</span>
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Timeframe:</span>
                  <select className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm" defaultValue="5">
                    <option value="1">1 Min</option><option value="5">5 Mins</option><option value="15">15 Mins</option><option value="30">30 Mins</option><option value="60">1 Hour</option>
                  </select>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2.5 mt-2.5 flex-wrap">
                  {renderEntryFields()}
                </div>
              </div>
              {entryConditions.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-300">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Added Conditions:</h4>
                  {entryConditions.map((cond, idx) => (
                    <div key={idx} className="text-xs text-gray-600 py-1 border-b last:border-b-0 flex items-center justify-between gap-2">
                      <span className="break-all">{idx + 1}. {cond.value}</span>
                      <button onClick={() => handleRemoveEntryCondition(idx)} className="ml-2 text-red-500 hover:text-red-700 font-bold flex-shrink-0" title="Remove condition">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exit When */}
            <div className="bg-red-50 border border-red-200 p-4 sm:p-8 rounded-xl shadow-sm mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <h3 className="text-base sm:text-lg text-gray-700 font-semibold">
                  📉 Exit When{' '}
                  <span className="inline-block w-[18px] h-[18px] rounded-full bg-gray-600 text-white text-[11px] text-center leading-[18px] ml-1.5 cursor-pointer" title="Exit conditions information">ⓘ</span>
                </h3>
              </div>
              <div className="mt-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2.5 mt-2.5 flex-wrap">
                  {renderExitFields()}
                </div>
              </div>
              {exitConditions.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-red-300">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Added Conditions:</h4>
                  {exitConditions.map((cond, idx) => (
                    <div key={idx} className="text-xs text-gray-600 py-1 border-b last:border-b-0 flex items-center justify-between gap-2">
                      <span className="break-all">{idx + 1}. {cond.value}</span>
                      <button onClick={() => handleRemoveExitCondition(idx)} className="ml-2 text-red-500 hover:text-red-700 font-bold flex-shrink-0" title="Remove condition">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Entry Trade */}
            <div className="bg-[#F3FBF6] border border-[#D1F2DE] p-4 sm:p-8 rounded-xl shadow-sm mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <h3 className="text-base sm:text-lg text-gray-700 font-semibold">Entry Trade</h3>
                <div className="flex gap-2">
                  <button className={`px-4 sm:px-6 py-2 border rounded-md font-semibold text-sm cursor-pointer transition-all ${expiryType === 'Weekly' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`} onClick={() => setExpiryType('Weekly')}>Weekly</button>
                  <button className={`px-4 sm:px-6 py-2 border rounded-md font-semibold text-sm cursor-pointer transition-all ${expiryType === 'Monthly' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`} onClick={() => setExpiryType('Monthly')}>Monthly</button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-4 bg-white">
                {/* Desktop table header - hidden on mobile */}
                <div className="hidden sm:grid grid-cols-[100px_120px_120px_170px_100px_120px_120px_80px] bg-gray-100 border-b-2 border-gray-300 min-w-[930px]">
                  {['Buy/Sell','Instrument','ATM','Lots','Type','Target','Stoploss','Actions'].map(h => (
                    <div key={h} className="p-4 text-left font-semibold text-gray-700 text-sm">{h}</div>
                  ))}
                </div>
                {/* Mobile shows card layout, desktop shows grid */}
                <div className="overflow-x-auto">
                  {trades.map(trade => <TradeRow key={trade.id} trade={trade} isExit={false} />)}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="px-4 sm:px-6 py-2.5 bg-indigo-600 text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md" onClick={handleAddTrade}>+ ADD</button>
                {!showExitSection && (
                  <button className="px-4 sm:px-6 py-2.5 bg-green-600 text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all hover:bg-green-700 hover:-translate-y-0.5 hover:shadow-md" onClick={handleAddExitTrade}>+ ADD EXIT TRADE</button>
                )}
              </div>
            </div>

            {/* Exit Trade */}
            {showExitSection && (
              <div className="bg-[#FFF5F5] border border-[#FFD6D6] p-4 sm:p-8 rounded-xl shadow-sm mb-6 sm:mb-8">
                <div className="flex justify-between items-center mb-4 sm:mb-6 flex-wrap gap-4">
                  <h3 className="text-base sm:text-lg text-gray-700 font-semibold">
                    Exit Trade{' '}
                    <span className="inline-block w-[18px] h-[18px] rounded-full bg-gray-600 text-white text-[11px] text-center leading-[18px] ml-1.5 cursor-pointer" title="Exit trade information">ⓘ</span>
                  </h3>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-4 bg-white">
                  <div className="hidden sm:grid grid-cols-[100px_120px_120px_170px_100px_120px_120px_80px] bg-gray-100 border-b-2 border-gray-300 min-w-[930px]">
                    {['Buy/Sell','Instrument','ATM','Lots','Type','Target','Stoploss','Actions'].map(h => (
                      <div key={h} className="p-4 text-left font-semibold text-gray-700 text-sm">{h}</div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    {exitTrades.map(trade => <TradeRow key={trade.id} trade={trade} isExit={true} />)}
                  </div>
                </div>
                <button className="px-4 sm:px-6 py-2.5 bg-indigo-600 text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md" onClick={handleAddExitTrade}>+ ADD</button>
              </div>
            )}

            {/* Bottom 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Computation Time */}
              <div className="bg-[#F5F8FF] border border-[#DCE6FF] p-4 sm:p-6 rounded-xl shadow-sm">
                <h3 className="text-base sm:text-lg mb-4 text-gray-700 font-semibold">⏰ Computation Time</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">No. of Times</label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-36 bg-white shadow-sm">
                    <button type="button" onClick={() => setNoOfTimes(prev => Math.max(0, prev - 1))} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-lg font-bold transition">−</button>
                    <input type="number" value={noOfTimes} onChange={(e) => setNoOfTimes(Number(e.target.value))} className="w-16 text-center border-none focus:outline-none text-sm font-semibold" min="0" />
                    <button type="button" onClick={() => setNoOfTimes(prev => prev + 1)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-lg font-bold transition">+</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">START</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">END</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">DAY</label>
                  <div className="grid grid-cols-6 gap-1 sm:gap-2">
                    {days.map((day, idx) => (
                      <button key={day} className={`px-1 sm:px-3 py-2 rounded-md border font-semibold text-xs cursor-pointer transition-all ${selectedDays.includes(day) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} onClick={() => toggleDay(day)}>{dayAbbreviations[idx]}</button>
                    ))}
                    <button className={`px-1 sm:px-3 py-2 rounded-md border font-semibold text-xs cursor-pointer transition-all ${selectedDays.length === 5 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} onClick={() => setSelectedDays(selectedDays.length === 5 ? [] : days)}>ALL</button>
                  </div>
                </div>
              </div>

              {/* Target Parameters */}
              <div className="bg-[#FFF9E6] border border-[#FFE58F] p-4 sm:p-6 rounded-xl shadow-sm">
                <h3 className="text-base sm:text-lg mb-4 text-gray-700 font-semibold">🎯 Target Parameters</h3>
                <div className="flex gap-2 mb-4">
                  <button className={`flex-1 px-4 py-2 rounded-md border font-semibold text-sm cursor-pointer transition-all ${targetType === '₹' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} onClick={() => setTargetType('₹')}>₹</button>
                  <button className={`flex-1 px-4 py-2 rounded-md border font-semibold text-sm cursor-pointer transition-all ${targetType === '%' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} onClick={() => setTargetType('%')}>%</button>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Profit</label>
                  <input type="number" value={fixedProfit} onChange={(e) => setFixedProfit(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stop Loss</label>
                  <input type="number" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" min="0" />
                </div>
              </div>

              {/* Backtest Period */}
              <div className="bg-[#F4FBF7] border border-[#CDEEDD] p-4 sm:p-6 rounded-xl shadow-sm">
                <h3 className="text-base sm:text-lg mb-4 text-gray-700 font-semibold">📅 Backtest Period</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                  <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
                    <option value="Custom">Custom</option><option value="1M">1 Month</option><option value="3M">3 Months</option><option value="6M">6 Months</option><option value="1Y">1 Year</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="text-center px-4">
              {message && (
                <div className={`mb-4 p-4 rounded-lg text-sm sm:text-base ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                  {message.text}
                </div>
              )}
              <button
                className="px-8 sm:px-12 py-3 sm:py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none rounded-lg font-bold text-sm sm:text-base cursor-pointer transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 w-full sm:w-auto"
                onClick={handleSubmit}
                disabled={isLoading || apiError.left}
              >
                {isLoading ? 'Running...' : 'Run Backtesting'}
              </button>
              {apiError.left && <div className="mt-2 text-red-600 text-xs">⚠️ Cannot submit: API connection error</div>}
            </div>

            {backtestResult && (
              <BacktestResults
                backtestResponse={backtestResult}
                fromDate={fromDate}
                toDate={toDate}
                onModify={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onNewBacktest={() => { setBacktestResult(null); setShowConfig(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 px-4 sm:px-8 text-center text-sm">
        <p className="mb-2 text-xs sm:text-sm leading-relaxed">SEBI Regn No: INH200009935 | BSE Enlistment No. 5592 | CIN No.U74999TG2022PTC162657</p>
        <p className="mb-4 text-xs sm:text-sm">© Modern Algos Pvt. Ltd. All Rights Reserved.</p>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
          <a href="#compliance" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">Compliance</a>
          <a href="#privacy" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">Privacy</a>
          <a href="#terms" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">Terms</a>
          <a href="#disclaimer" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">Disclaimer</a>
          <a href="#mitc" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">MITC</a>
        </div>
      </footer>
    </div>
  );
}

export default App;