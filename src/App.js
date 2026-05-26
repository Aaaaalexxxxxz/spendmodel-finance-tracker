import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

const STORAGE_KEY = "spendly.transactions.v1";
const RECURRING_KEY = "spendly.recurring.v1";
const GOAL_KEY = "spendly.goal.v1";

const categories = [
  "Housing",
  "Food",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Subscriptions",
  "Debt",
  "Savings",
  "Income",
  "Other"
];

const sampleTransactions = [
  ["2026-02-02", "Salary", "Income", "income", 4200],
  ["2026-02-03", "Rent", "Housing", "expense", 1450],
  ["2026-03-02", "Salary", "Income", "income", 4200],
  ["2026-03-03", "Rent", "Housing", "expense", 1450],
  ["2026-04-02", "Salary", "Income", "income", 4300],
  ["2026-04-03", "Rent", "Housing", "expense", 1450],
  ["2026-04-10", "Car repair", "Transport", "expense", 388.44],
  ["2026-05-02", "Salary", "Income", "income", 4300],
  ["2026-05-03", "Rent", "Housing", "expense", 1450],
  ["2026-05-06", "Groceries", "Food", "expense", 205.32],
  ["2026-05-08", "Lunches", "Food", "expense", 91.6],
  ["2026-05-12", "New headphones", "Shopping", "expense", 229.99],
  ["2026-05-21", "Credit card payment", "Debt", "expense", 260]
].map(([date, description, category, type, amount], index) => ({
  id: `sample-${index}`,
  date,
  description,
  category,
  type,
  amount
}));

const sampleRecurringRules = [
  { id: "rent", name: "Rent", amount: 1450, category: "Housing", frequency: "monthly", startDate: "2026-02-03" },
  { id: "phone", name: "Phone payment", amount: 75, category: "Subscriptions", frequency: "monthly", startDate: "2026-02-12" },
  { id: "insurance", name: "Car insurance", amount: 132, category: "Transport", frequency: "monthly", startDate: "2026-02-20" }
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const today = () => new Date().toISOString().slice(0, 10);
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function App() {
  const [transactions, setTransactions] = useState(sampleTransactions);
  const [recurringRules, setRecurringRules] = useState(sampleRecurringRules);
  const [activeTab, setActiveTab] = useState("overview");
  const [addVisible, setAddVisible] = useState(false);
  const [manageVisible, setManageVisible] = useState(false);
  const [addMode, setAddMode] = useState("transaction");
  const [period, setPeriod] = useState("90");
  const [goal, setGoal] = useState("800");
  const [form, setForm] = useState({ description: "", amount: "", type: "expense", category: "Food", date: today() });
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    amount: "",
    category: "Housing",
    frequency: "monthly",
    startDate: today()
  });
  const [receiptText, setReceiptText] = useState("");
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptDate, setReceiptDate] = useState(today());
  const [receiptCategory, setReceiptCategory] = useState("Other");
  const [receiptItems, setReceiptItems] = useState([]);

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(recurringRules));
  }, [recurringRules]);

  useEffect(() => {
    AsyncStorage.setItem(GOAL_KEY, goal);
  }, [goal]);

  const filteredTransactions = useMemo(() => {
    const synced = syncRecurringTransactions(transactions, recurringRules);
    if (period === "all") return synced;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(period));
    return synced.filter((item) => new Date(`${item.date}T00:00:00`) >= cutoff);
  }, [transactions, recurringRules, period]);

  const model = useMemo(() => buildModel(filteredTransactions, recurringRules), [filteredTransactions, recurringRules]);

  async function loadStoredData() {
    const [savedTransactions, savedRecurring, savedGoal] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(RECURRING_KEY),
      AsyncStorage.getItem(GOAL_KEY)
    ]);
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedRecurring) setRecurringRules(JSON.parse(savedRecurring));
    if (savedGoal) setGoal(savedGoal);
  }

  function openAdd() {
    setAddMode("transaction");
    setAddVisible(true);
  }

  function addTransaction() {
    if (!form.description || !Number(form.amount)) {
      Alert.alert("Missing transaction", "Add a description and amount first.");
      return;
    }
    setTransactions((items) => [
      ...items,
      { id: makeId(), ...form, amount: Math.abs(Number(form.amount)) }
    ]);
    setForm({ description: "", amount: "", type: "expense", category: "Food", date: today() });
    setAddVisible(false);
  }

  function addRecurringBill() {
    if (!recurringForm.name || !Number(recurringForm.amount)) {
      Alert.alert("Missing bill", "Add a bill name and amount first.");
      return;
    }
    setRecurringRules((items) => [
      ...items,
      { id: makeId(), ...recurringForm, amount: Math.abs(Number(recurringForm.amount)) }
    ]);
    setRecurringForm({ name: "", amount: "", category: "Housing", frequency: "monthly", startDate: today() });
    setAddVisible(false);
  }

  function parseReceipt() {
    const parsed = parseReceiptLines(receiptText, receiptCategory);
    setReceiptItems(parsed);
  }

  function addReceiptItems() {
    if (!receiptItems.length) {
      Alert.alert("No items found", "Paste OCR text and parse it before adding.");
      return;
    }
    setTransactions((items) => [
      ...items,
      ...receiptItems.map((item) => ({
        id: makeId(),
        date: receiptDate,
        description: item.description,
        category: item.category,
        type: "expense",
        amount: item.amount
      }))
    ]);
    setReceiptText("");
    setReceiptItems([]);
    setAddVisible(false);
  }

  function resetData() {
    setTransactions(sampleTransactions);
    setRecurringRules(sampleRecurringRules);
    setGoal("800");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.app}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Personal finance model</Text>
            <Text style={styles.brand}>Spendly</Text>
          </View>
          {activeTab === "overview" && <Overview model={model} />}
          {activeTab === "activity" && <Activity transactions={filteredTransactions} />}
          {activeTab === "budget" && (
            <Budget
              model={model}
              period={period}
              setPeriod={setPeriod}
              goal={goal}
              setGoal={setGoal}
            />
          )}
          {activeTab === "profile" && <Profile resetData={resetData} period={period} setPeriod={setPeriod} goal={goal} setGoal={setGoal} />}
        </ScrollView>
        <Footer activeTab={activeTab} setActiveTab={setActiveTab} openAdd={openAdd} />
        <AddModal
          visible={addVisible}
          close={() => setAddVisible(false)}
          addMode={addMode}
          setAddMode={setAddMode}
          form={form}
          setForm={setForm}
          addTransaction={addTransaction}
          recurringForm={recurringForm}
          setRecurringForm={setRecurringForm}
          addRecurringBill={addRecurringBill}
          openManager={() => {
            setAddVisible(false);
            setManageVisible(true);
          }}
          receiptText={receiptText}
          setReceiptText={setReceiptText}
          receiptImage={receiptImage}
          pickReceiptImage={pickReceiptImage}
          takeReceiptPhoto={takeReceiptPhoto}
          receiptDate={receiptDate}
          setReceiptDate={setReceiptDate}
          receiptCategory={receiptCategory}
          setReceiptCategory={setReceiptCategory}
          receiptItems={receiptItems}
          parseReceipt={parseReceipt}
          addReceiptItems={addReceiptItems}
        />
        <RecurringManager
          visible={manageVisible}
          close={() => setManageVisible(false)}
          rules={recurringRules}
          removeRule={(id) => setRecurringRules((rules) => rules.filter((rule) => rule.id !== id))}
        />
      </View>
    </SafeAreaView>
  );

  async function pickReceiptImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo permission needed", "Allow photo access to import a receipt image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });
    if (!result.canceled) setReceiptImage(result.assets[0]);
  }

  async function takeReceiptPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed", "Allow camera access to capture a receipt.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85
    });
    if (!result.canceled) setReceiptImage(result.assets[0]);
  }
}

function Overview({ model }) {
  return (
    <View>
      <View style={styles.metricGrid}>
        <Metric label="Income" value={compactCurrency.format(model.income)} tone="income" detail={`${model.incomeCount} income entries`} />
        <Metric label="Spending" value={compactCurrency.format(model.expenses)} tone="expense" detail={`${compactCurrency.format(model.dailySpend)} average per day`} />
        <Metric label="Net Savings" value={compactCurrency.format(model.net)} tone="savings" detail={`${Math.round(model.savingsRate * 100)}% savings rate`} />
        <Metric label="30-Day Forecast" value={compactCurrency.format(model.forecast)} tone="accent" detail={`${compactCurrency.format(model.monthlyRecurring)} fixed monthly bills`} />
      </View>
      <Panel title="Monthly cash flow" meta={`${model.months.length} months`}>
        <CashFlowChart months={model.months} />
      </Panel>
      <Panel title="Category mix" meta={compactCurrency.format(model.expenses)}>
        <CategoryChart categories={model.categories} />
      </Panel>
      <Panel title="Habit summary" meta={`Score ${model.score}`}>
        <Insight title={`${model.topCategory?.[0] || "Spending"} leads this period`} detail={model.topCategory ? `${currency.format(model.topCategory[1])} across the selected window.` : "Add spending to build your summary."} />
        <Insight title={model.net >= 0 ? "Savings are positive" : "Spending is ahead"} detail={`${currency.format(model.net)} net savings in this window.`} />
      </Panel>
    </View>
  );
}

function Activity({ transactions }) {
  return (
    <Panel title="Recent activity" meta={`${transactions.length} records`}>
      {transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((item) => (
        <View style={styles.row} key={item.id}>
          <View>
            <Text style={styles.rowTitle}>{item.description}</Text>
            <Text style={styles.rowMeta}>{item.date} · {item.category}</Text>
          </View>
          <Text style={[styles.rowAmount, item.type === "income" ? styles.incomeText : styles.expenseText]}>
            {item.type === "expense" ? "-" : ""}{currency.format(item.amount)}
          </Text>
        </View>
      ))}
    </Panel>
  );
}

function Budget({ model, period, setPeriod, goal, setGoal }) {
  return (
    <View>
      <Panel title="Budget view">
        <PickerLike label="Time window" value={period} setValue={setPeriod} options={["30", "90", "180", "365", "all"]} />
        <Field label="Savings goal" value={goal} onChangeText={setGoal} keyboardType="numeric" />
      </Panel>
      <Panel title="Goal model">
        <View style={styles.meter}><View style={[styles.meterFill, { width: `${Math.min(100, Math.max(0, model.net / Math.max(1, Number(goal)) * 100))}%` }]} /></View>
        <Text style={styles.muted}>You have reached {Math.round(Math.min(100, Math.max(0, model.net / Math.max(1, Number(goal)) * 100)))}% of your goal.</Text>
      </Panel>
      <Panel title="Recurring pressure" meta={`${compactCurrency.format(model.monthlyRecurring)} fixed`}>
        {model.recurring.map((item) => <Insight key={item.name} title={item.name} detail={`${currency.format(item.total)} · ${item.count} transactions`} />)}
      </Panel>
    </View>
  );
}

function Profile({ resetData, period, setPeriod, goal, setGoal }) {
  return (
    <View>
      <Panel title="Model settings">
        <PickerLike label="Time window" value={period} setValue={setPeriod} options={["30", "90", "180", "365", "all"]} />
        <Field label="Savings goal" value={goal} onChangeText={setGoal} keyboardType="numeric" />
      </Panel>
      <Panel title="Privacy">
        <Insight title="Local-only storage" detail="No remote database is required for the current mobile app." />
        <Insight title="Receipt OCR ready" detail="The receipt parser is ready for an OCR API or on-device model integration." />
      </Panel>
      <Pressable style={styles.dangerButton} onPress={resetData}><Text style={styles.dangerButtonText}>Reset Data</Text></Pressable>
    </View>
  );
}

function AddModal(props) {
  return (
    <Modal visible={props.visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Add money movement</Text>
            <Pressable onPress={props.close}><Ionicons name="close" size={24} color="#ecf2f8" /></Pressable>
          </View>
          <View style={styles.modeTabs}>
            {["transaction", "recurring", "receipt"].map((mode) => (
              <Pressable key={mode} style={[styles.modeTab, props.addMode === mode && styles.modeTabActive]} onPress={() => props.setAddMode(mode)}>
                <Text style={[styles.modeTabText, props.addMode === mode && styles.modeTabTextActive]}>{titleCase(mode)}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView>
            {props.addMode === "transaction" && (
              <View>
                <Field label="Description" value={props.form.description} onChangeText={(value) => props.setForm({ ...props.form, description: value })} />
                <Field label="Amount" value={props.form.amount} onChangeText={(value) => props.setForm({ ...props.form, amount: value })} keyboardType="numeric" />
                <PickerLike label="Category" value={props.form.category} setValue={(value) => props.setForm({ ...props.form, category: value })} options={categories} />
                <Pressable style={styles.primaryButton} onPress={props.addTransaction}><Text style={styles.primaryButtonText}>Add Transaction</Text></Pressable>
              </View>
            )}
            {props.addMode === "recurring" && (
              <View>
                <Field label="Bill name" value={props.recurringForm.name} onChangeText={(value) => props.setRecurringForm({ ...props.recurringForm, name: value })} />
                <Field label="Amount" value={props.recurringForm.amount} onChangeText={(value) => props.setRecurringForm({ ...props.recurringForm, amount: value })} keyboardType="numeric" />
                <PickerLike label="Category" value={props.recurringForm.category} setValue={(value) => props.setRecurringForm({ ...props.recurringForm, category: value })} options={categories} />
                <Pressable style={styles.primaryButton} onPress={props.addRecurringBill}><Text style={styles.primaryButtonText}>Add Recurring Bill</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={props.openManager}><Text style={styles.secondaryButtonText}>Manage Recurring Bills</Text></Pressable>
              </View>
            )}
            {props.addMode === "receipt" && (
              <View>
                <Text style={styles.muted}>Take or upload a receipt photo, then paste OCR text below to parse receipt items. A secure OCR endpoint can be connected here next.</Text>
                <View style={styles.receiptActions}>
                  <Pressable style={styles.secondaryButton} onPress={props.pickReceiptImage}><Text style={styles.secondaryButtonText}>Upload Receipt</Text></Pressable>
                  <Pressable style={styles.secondaryButton} onPress={props.takeReceiptPhoto}><Text style={styles.secondaryButtonText}>Take Photo</Text></Pressable>
                </View>
                {props.receiptImage ? <Text style={styles.receiptImageLabel}>{props.receiptImage.fileName || "Receipt image selected"}</Text> : null}
                <Field label="OCR text" value={props.receiptText} onChangeText={props.setReceiptText} multiline />
                <Field label="Receipt date" value={props.receiptDate} onChangeText={props.setReceiptDate} />
                <PickerLike label="Default category" value={props.receiptCategory} setValue={props.setReceiptCategory} options={categories} />
                <Pressable style={styles.primaryButton} onPress={props.parseReceipt}><Text style={styles.primaryButtonText}>Parse Receipt</Text></Pressable>
                {props.receiptItems.map((item, index) => <Insight key={`${item.description}-${index}`} title={item.description} detail={`${item.category} · ${currency.format(item.amount)}`} />)}
                <Pressable style={styles.secondaryButton} onPress={props.addReceiptItems}><Text style={styles.secondaryButtonText}>Add Parsed Items</Text></Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RecurringManager({ visible, close, rules, removeRule }) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Manage recurring bills</Text>
            <Pressable onPress={close}><Ionicons name="close" size={24} color="#ecf2f8" /></Pressable>
          </View>
          {rules.map((rule) => (
            <View style={styles.row} key={rule.id}>
              <View>
                <Text style={styles.rowTitle}>{rule.name}</Text>
                <Text style={styles.rowMeta}>{rule.frequency} · {rule.category}</Text>
              </View>
              <Pressable onPress={() => removeRule(rule.id)}><Text style={styles.deleteText}>Delete</Text></Pressable>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function Metric({ label, value, detail, tone }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, styles[`${tone}Text`]]}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function Panel({ title, meta, children }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>{title}</Text>
        {meta ? <Text style={styles.panelMeta}>{meta}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Insight({ title, detail }) {
  return (
    <View style={styles.insight}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowMeta}>{detail}</Text>
    </View>
  );
}

function Field({ label, multiline, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && styles.textarea]} placeholderTextColor="#66758a" multiline={multiline} {...props} />
    </View>
  );
}

function PickerLike({ label, value, setValue, options }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((option) => (
          <Pressable key={option} style={[styles.chip, value === option && styles.chipActive]} onPress={() => setValue(option)}>
            <Text style={[styles.chipText, value === option && styles.chipTextActive]}>{periodLabel(option)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Footer({ activeTab, setActiveTab, openAdd }) {
  const tabs = [
    ["overview", "home-outline", "Overview"],
    ["activity", "list-outline", "Activity"],
    ["budget", "cash-outline", "Budget"],
    ["profile", "person-circle-outline", "Profile"]
  ];
  return (
    <View style={styles.footer}>
      {tabs.slice(0, 2).map(([key, icon, label]) => <FooterButton key={key} active={activeTab === key} icon={icon} label={label} onPress={() => setActiveTab(key)} />)}
      <Pressable style={styles.addButton} onPress={openAdd}><Ionicons name="add" size={34} color="#06111d" /></Pressable>
      {tabs.slice(2).map(([key, icon, label]) => <FooterButton key={key} active={activeTab === key} icon={icon} label={label} onPress={() => setActiveTab(key)} />)}
    </View>
  );
}

function FooterButton({ active, icon, label, onPress }) {
  return (
    <Pressable style={[styles.footerButton, active && styles.footerButtonActive]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={active ? "#60a5fa" : "#9aa8b8"} />
      <Text style={[styles.footerLabel, active && styles.footerLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function CashFlowChart({ months }) {
  const max = Math.max(...months.flatMap((month) => [month.income, month.expenses]), 1);
  const width = 320;
  const height = 180;
  const slot = width / Math.max(1, months.length);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[45, 85, 125, 165].map((y) => <Line key={y} x1="8" x2="312" y1={y} y2={y} stroke="#263445" />)}
      {months.map((month, index) => {
        const incomeHeight = (month.income / max) * 125;
        const expenseHeight = (month.expenses / max) * 125;
        const x = index * slot + slot * 0.28;
        return (
          <G key={month.month}>
            <Rect x={x} y={160 - incomeHeight} width={slot * 0.18} height={incomeHeight} fill="#2dd4bf" rx="3" />
            <Rect x={x + slot * 0.24} y={160 - expenseHeight} width={slot * 0.18} height={expenseHeight} fill="#fb7185" rx="3" />
            <SvgText x={x} y="176" fill="#9aa8b8" fontSize="10" fontWeight="700">{month.month.slice(5)}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function CategoryChart({ categories }) {
  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0) || 1;
  const colors = ["#60a5fa", "#2dd4bf", "#fb7185", "#fbbf24", "#86efac"];
  let start = -Math.PI / 2;
  return (
    <View style={styles.pieWrap}>
      <Svg width={180} height={180} viewBox="0 0 180 180">
        {entries.map(([name, amount], index) => {
          const angle = amount / total * Math.PI * 2;
          const path = arcPath(90, 90, 76, start, start + angle);
          start += angle;
          return <Path key={name} d={path} fill={colors[index]} />;
        })}
        <Circle cx="90" cy="90" r="42" fill="#0d1722" />
      </Svg>
      <View style={styles.legend}>
        {entries.map(([name, amount], index) => (
          <View style={styles.legendRow} key={name}>
            <View style={[styles.legendSwatch, { backgroundColor: colors[index] }]} />
            <Text style={styles.legendText}>{name} · {compactCurrency.format(amount)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildModel(data, recurringRules) {
  const incomeItems = data.filter((item) => item.type === "income");
  const expenseItems = data.filter((item) => item.type === "expense");
  const income = sum(incomeItems);
  const expenses = sum(expenseItems);
  const net = income - expenses;
  const dailySpend = expenses / Math.max(1, dateSpanDays(data));
  const monthlyRecurring = recurringRules.reduce((total, rule) => total + monthlyValue(rule), 0);
  const categoriesByTotal = groupTotals(expenseItems, "category");
  const recurring = Object.entries(groupTotals(expenseItems, "description"))
    .map(([name, total]) => ({ name, total, count: expenseItems.filter((item) => item.description === name).length }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  return {
    income,
    incomeCount: incomeItems.length,
    expenses,
    net,
    dailySpend,
    forecast: dailySpend * 30 + monthlyRecurring,
    monthlyRecurring,
    months: groupByMonth(data),
    categories: categoriesByTotal,
    recurring,
    topCategory: Object.entries(categoriesByTotal).sort((a, b) => b[1] - a[1])[0],
    savingsRate: income ? net / income : 0,
    score: Math.max(0, Math.min(100, Math.round(50 + (income ? net / income : 0) * 120)))
  };
}

function sum(items) {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

function groupTotals(items, key) {
  return items.reduce((totals, item) => {
    totals[item[key]] = (totals[item[key]] || 0) + Number(item.amount || 0);
    return totals;
  }, {});
}

function groupByMonth(data) {
  const groups = {};
  data.forEach((item) => {
    const month = item.date.slice(0, 7);
    groups[month] ||= { month, income: 0, expenses: 0 };
    groups[month][item.type === "income" ? "income" : "expenses"] += Number(item.amount || 0);
  });
  return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
}

function dateSpanDays(data) {
  if (!data.length) return 1;
  const dates = data.map((item) => new Date(`${item.date}T00:00:00`).getTime());
  return Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1);
}

function syncRecurringTransactions(transactions, rules) {
  const manual = transactions.filter((item) => !item.recurringId);
  const manualKeys = new Set(manual.map(transactionKey));
  const generated = rules.flatMap((rule) => occurrencesUntilToday(rule).map((date) => ({
    id: `recurring-${rule.id}-${date}`,
    recurringId: rule.id,
    date,
    description: rule.name,
    category: rule.category,
    type: "expense",
    amount: Number(rule.amount)
  })));
  return [...manual, ...generated.filter((item) => !manualKeys.has(transactionKey(item)))];
}

function transactionKey(item) {
  return `${item.date}|${item.description}|${item.category}|${item.type}|${Number(item.amount).toFixed(2)}`;
}

function occurrencesUntilToday(rule) {
  const dates = [];
  const current = new Date(`${rule.startDate}T00:00:00`);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  while (current <= end && dates.length < 240) {
    dates.push(current.toISOString().slice(0, 10));
    if (rule.frequency === "weekly") current.setDate(current.getDate() + 7);
    else if (rule.frequency === "biweekly") current.setDate(current.getDate() + 14);
    else current.setMonth(current.getMonth() + 1);
  }
  return dates;
}

function monthlyValue(rule) {
  if (rule.frequency === "weekly") return Number(rule.amount) * 52 / 12;
  if (rule.frequency === "biweekly") return Number(rule.amount) * 26 / 12;
  return Number(rule.amount);
}

function parseReceiptLines(text, fallbackCategory) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = line.match(/(.+?)\s+\$?(-?\d+(?:\.\d{2})?)$/);
    if (!match) return null;
    const description = match[1].replace(/\s{2,}/g, " ").trim();
    const amount = Math.abs(Number(match[2]));
    if (!description || !amount || /subtotal|total|tax|visa|cash|credit|debit/i.test(description)) return null;
    return { description, amount, category: classifyReceiptItem(description, fallbackCategory) };
  }).filter(Boolean);
}

function classifyReceiptItem(description, fallbackCategory) {
  const text = description.toLowerCase();
  if (/coffee|milk|bread|egg|fruit|rice|chicken|beef|snack|pizza|grocery|food/.test(text)) return "Food";
  if (/gas|fuel|parking|uber|lyft|taxi|transit|train|bus/.test(text)) return "Transport";
  if (/pharmacy|medicine|vitamin|clinic|drug|health/.test(text)) return "Health";
  if (/movie|ticket|game|book|music|concert/.test(text)) return "Entertainment";
  if (/shirt|shoe|clothes|device|charger|headphone|home|kitchen/.test(text)) return "Shopping";
  return fallbackCategory;
}

function periodLabel(option) {
  return { "30": "30 days", "90": "90 days", "180": "6 months", "365": "1 year", all: "All" }[option] || option;
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#08111b" },
  app: { flex: 1, backgroundColor: "#08111b" },
  content: { padding: 20, paddingBottom: 120 },
  header: { marginBottom: 18 },
  eyebrow: { color: "#9aa8b8", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  brand: { color: "#ecf2f8", fontSize: 46, fontWeight: "900" },
  metricGrid: { gap: 12 },
  metric: { padding: 18, borderWidth: 1, borderColor: "#263445", borderRadius: 10, backgroundColor: "#121a24" },
  metricLabel: { color: "#9aa8b8", fontSize: 15 },
  metricValue: { marginTop: 8, color: "#ecf2f8", fontSize: 28, fontWeight: "900" },
  metricDetail: { marginTop: 4, color: "#9aa8b8" },
  panel: { marginTop: 16, padding: 18, borderWidth: 1, borderColor: "#263445", borderRadius: 10, backgroundColor: "#121a24" },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  panelTitle: { color: "#ecf2f8", fontSize: 16, fontWeight: "900" },
  panelMeta: { color: "#9aa8b8", fontWeight: "800" },
  incomeText: { color: "#2dd4bf" },
  expenseText: { color: "#fb7185" },
  savingsText: { color: "#86efac" },
  accentText: { color: "#60a5fa" },
  muted: { color: "#9aa8b8", lineHeight: 21 },
  insight: { padding: 12, marginTop: 10, borderWidth: 1, borderColor: "#263445", borderRadius: 10, backgroundColor: "#0e1925" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#263445" },
  rowTitle: { color: "#ecf2f8", fontWeight: "800" },
  rowMeta: { marginTop: 3, color: "#9aa8b8" },
  rowAmount: { color: "#ecf2f8", fontWeight: "900" },
  field: { marginBottom: 12 },
  label: { marginBottom: 7, color: "#9aa8b8", fontWeight: "800" },
  input: { minHeight: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: "#263445", borderRadius: 10, backgroundColor: "#0d1722", color: "#ecf2f8" },
  textarea: { minHeight: 110, paddingTop: 12, textAlignVertical: "top" },
  chip: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#263445", borderRadius: 10, backgroundColor: "#0d1722" },
  chipActive: { borderColor: "#60a5fa", backgroundColor: "rgba(96, 165, 250, 0.14)" },
  chipText: { color: "#9aa8b8", fontWeight: "800" },
  chipTextActive: { color: "#60a5fa" },
  meter: { height: 14, overflow: "hidden", borderRadius: 999, backgroundColor: "#263445" },
  meterFill: { height: "100%", backgroundColor: "#60a5fa" },
  footer: { position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 8, borderWidth: 1, borderColor: "#374a60", borderRadius: 18, backgroundColor: "rgba(14, 24, 36, 0.96)" },
  footerButton: { width: 58, minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  footerButtonActive: { backgroundColor: "rgba(96, 165, 250, 0.14)" },
  footerLabel: { marginTop: 3, color: "#9aa8b8", fontSize: 11, fontWeight: "800" },
  footerLabelActive: { color: "#60a5fa" },
  addButton: { width: 66, height: 66, marginTop: -34, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#60a5fa" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18, backgroundColor: "rgba(3, 7, 18, 0.72)" },
  modalCard: { width: "100%", maxHeight: "84%", padding: 18, borderWidth: 1, borderColor: "#263445", borderRadius: 12, backgroundColor: "#121a24" },
  modeTabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
  modeTab: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: "#263445", borderRadius: 10, alignItems: "center" },
  modeTabActive: { borderColor: "#60a5fa", backgroundColor: "rgba(96, 165, 250, 0.14)" },
  modeTabText: { color: "#9aa8b8", fontWeight: "800" },
  modeTabTextActive: { color: "#60a5fa" },
  primaryButton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#60a5fa" },
  primaryButtonText: { color: "#06111d", fontWeight: "900" },
  secondaryButton: { minHeight: 46, marginTop: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#263445", borderRadius: 10, backgroundColor: "#0d1722" },
  secondaryButtonText: { color: "#ecf2f8", fontWeight: "900" },
  receiptActions: { flexDirection: "row", gap: 10, marginBottom: 10 },
  receiptImageLabel: { marginBottom: 10, color: "#60a5fa", fontWeight: "800" },
  dangerButton: { minHeight: 46, marginTop: 16, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#fb7185" },
  dangerButtonText: { color: "#06111d", fontWeight: "900" },
  deleteText: { color: "#fb7185", fontWeight: "900" },
  pieWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: "#ecf2f8", fontWeight: "800" }
});
