import SwiftUI
import PhotosUI
import UIKit

@main
struct SpendlyApp: App {
    var body: some Scene {
        WindowGroup {
            SpendlyRootView()
                .preferredColorScheme(.dark)
        }
    }
}

struct Transaction: Identifiable, Codable {
    let id: UUID
    var date: Date
    var description: String
    var category: String
    var type: TransactionType
    var amount: Double
}

struct ReceiptArchive: Identifiable {
    let id: UUID
    var date: Date
    var merchant: String
    var imageData: Data?
    var rawText: String
    var items: [ReceiptLineItem]
}

struct ReceiptLineItem: Identifiable, Codable {
    var id = UUID()
    var description: String
    var amountText: String
    var category: String

    var amount: Double {
        Double(amountText.filter { $0.isNumber || $0 == "." }) ?? 0
    }
}

enum TransactionType: String, Codable, CaseIterable {
    case expense = "Expense"
    case income = "Income"
}

struct Category: Identifiable {
    let id: String
    let symbol: String
}

let spendlyCategories: [Category] = [
    Category(id: "Housing", symbol: "house"),
    Category(id: "Food", symbol: "fork.knife"),
    Category(id: "Transport", symbol: "car"),
    Category(id: "Shopping", symbol: "bag"),
    Category(id: "Health", symbol: "cross.case"),
    Category(id: "Entertainment", symbol: "music.note"),
    Category(id: "Subscriptions", symbol: "arrow.triangle.2.circlepath"),
    Category(id: "Debt", symbol: "creditcard"),
    Category(id: "Savings", symbol: "chart.line.uptrend.xyaxis"),
    Category(id: "Income", symbol: "dollarsign.circle"),
    Category(id: "Other", symbol: "square.grid.2x2")
]

struct LocaleSettings {
    var region: SpendlyRegion = .unitedStates
    var currency: SpendlyCurrency = .usd
}

enum SpendlyRegion: String, CaseIterable, Identifiable {
    case unitedStates = "United States"
    case canada = "Canada"
    case unitedKingdom = "United Kingdom"
    case europeanUnion = "European Union"
    case japan = "Japan"

    var id: String { rawValue }
}

enum SpendlyCurrency: String, CaseIterable, Identifiable {
    case usd = "USD"
    case cad = "CAD"
    case gbp = "GBP"
    case eur = "EUR"
    case jpy = "JPY"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .usd: return "USD - US Dollar"
        case .cad: return "CAD - Canadian Dollar"
        case .gbp: return "GBP - British Pound"
        case .eur: return "EUR - Euro"
        case .jpy: return "JPY - Japanese Yen"
        }
    }
}

struct SpendlyRootView: View {
    @State private var selectedTab: AppTab = .overview
    @State private var addSheetVisible = false
    @State private var transactions = Transaction.samples
    @State private var receiptArchive: [ReceiptArchive] = []
    @State private var savingsGoal = 800.0
    @State private var localeSettings = LocaleSettings()

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            TabView(selection: $selectedTab) {
                tabPage {
                    OverviewView(transactions: transactions, currency: localeSettings.currency)
                }
                .tag(AppTab.overview)
                .tabItem { Label(AppTab.overview.rawValue, systemImage: AppTab.overview.symbol) }

                tabPage {
                    ActivityView(transactions: $transactions, currency: localeSettings.currency)
                }
                .tag(AppTab.activity)
                .tabItem { Label(AppTab.activity.rawValue, systemImage: AppTab.activity.symbol) }

                tabPage {
                    BudgetView(transactions: transactions, savingsGoal: $savingsGoal, currency: localeSettings.currency)
                }
                .tag(AppTab.budget)
                .tabItem { Label(AppTab.budget.rawValue, systemImage: AppTab.budget.symbol) }

                tabPage {
                    ProfileView(resetData: { transactions = Transaction.samples }, savingsGoal: $savingsGoal, localeSettings: $localeSettings, receiptArchive: receiptArchive)
                }
                .tag(AppTab.profile)
                .tabItem { Label(AppTab.profile.rawValue, systemImage: AppTab.profile.symbol) }
            }
            .tint(.blue)
            .toolbarBackground(.regularMaterial, for: .tabBar)
            .toolbarBackground(.visible, for: .tabBar)
            .tabViewStyle(.sidebarAdaptable)

            Button {
                addSheetVisible = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(Color(hex: 0x06111D))
                    .frame(width: 66, height: 66)
                    .liquidGlass(cornerRadius: 22, tint: .blue, intensity: 0.9)
                    .shadow(color: .blue.opacity(0.38), radius: 22, y: 10)
            }
            .buttonStyle(PressScaleStyle())
            .padding(.trailing, 20)
            .padding(.bottom, 66)
            .accessibilityLabel("Add transaction")
        }
        .sheet(isPresented: $addSheetVisible) {
            AddTransactionSheet { newTransactions, receipt in
                transactions.append(contentsOf: newTransactions)
                if let receipt {
                    receiptArchive.insert(receipt, at: 0)
                }
                addSheetVisible = false
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Personal finance model")
                .font(.caption.weight(.heavy))
                .textCase(.uppercase)
                .foregroundStyle(.secondary)
            Text("Spendly")
                .font(.system(size: 46, weight: .black, design: .rounded))
                .foregroundStyle(.white)
        }
    }

    private func tabPage<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        ZStack {
            LinearGradient(colors: [Color(hex: 0x0B1522), Color(hex: 0x08111B), Color(hex: 0x060B12)], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    content()
                }
                .padding(20)
                .padding(.bottom, 122)
            }
        }
    }
}

enum AppTab: String, CaseIterable {
    case overview = "Overview"
    case activity = "Activity"
    case budget = "Budget"
    case profile = "Profile"

    var symbol: String {
        switch self {
        case .overview: return "house"
        case .activity: return "list.bullet"
        case .budget: return "dollarsign"
        case .profile: return "person.crop.circle"
        }
    }
}

struct OverviewView: View {
    let transactions: [Transaction]
    let currency: SpendlyCurrency

    private var income: Double { transactions.filter { $0.type == .income }.map(\.amount).reduce(0, +) }
    private var spending: Double { transactions.filter { $0.type == .expense }.map(\.amount).reduce(0, +) }

    var body: some View {
        VStack(spacing: 12) {
            MetricGrid(income: income, spending: spending, currency: currency)
            Panel(title: "Habit summary") {
                InsightRow(title: spending > 0 ? "Food leads this period" : "Add spending to build your summary", detail: "Transactions stay local on this device.")
                InsightRow(title: income - spending >= 0 ? "Savings are positive" : "Spending is ahead", detail: "\(money(income - spending, currency: currency)) net savings.")
            }
        }
    }
}

struct MetricGrid: View {
    let income: Double
    let spending: Double
    let currency: SpendlyCurrency

    var body: some View {
        VStack(spacing: 12) {
            MetricCard(title: "Income", value: money(income, currency: currency), detail: "Income entries", color: .teal)
            MetricCard(title: "Spending", value: money(spending, currency: currency), detail: "Selected window", color: .pink)
            MetricCard(title: "Net Savings", value: money(income - spending, currency: currency), detail: "Income minus spending", color: .green)
            MetricCard(title: "30-Day Forecast", value: money(spending * 0.42, currency: currency), detail: "Modeled from habits", color: .blue)
        }
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    let detail: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).foregroundStyle(.secondary)
            Text(value).font(.title.bold()).foregroundStyle(color)
            Text(detail).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(cardBackground)
    }
}

struct ActivityView: View {
    @Binding var transactions: [Transaction]
    let currency: SpendlyCurrency
    @State private var isEditing = false

    var body: some View {
        Panel(title: "Recent activity") {
            HStack {
                Spacer()
                Button(isEditing ? "Done" : "Edit") {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                        isEditing.toggle()
                    }
                }
                .buttonStyle(CompactGlassButtonStyle(tint: isEditing ? .teal : .blue))
            }

            ForEach(transactions.sorted { $0.date > $1.date }) { item in
                ActivityRow(item: item, currency: currency, isEditing: isEditing) {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                        transactions.removeAll { $0.id == item.id }
                    }
                }
            }
        }
    }
}

struct ActivityRow: View {
    let item: Transaction
    let currency: SpendlyCurrency
    let isEditing: Bool
    let delete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                if isEditing {
                    Button(action: delete) {
                        Image(systemName: "xmark")
                            .font(.caption.weight(.black))
                            .foregroundStyle(.pink)
                            .frame(width: 28, height: 28)
                            .liquidGlass(cornerRadius: 14, tint: .pink, intensity: 0.18)
                    }
                    .buttonStyle(PressScaleStyle())
                    .transition(.scale.combined(with: .opacity))
                }

                Text(shortDate(item.date))
                    .font(.caption.weight(.heavy))
                    .foregroundStyle(.secondary)
                    .frame(width: 48, alignment: .leading)
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.description).font(.subheadline.weight(.heavy))
                    Text(item.category).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Text("\(item.type == .expense ? "-" : "")\(money(item.amount, currency: currency))")
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(item.type == .expense ? .pink : .teal)
            }
            .padding(.vertical, 9)
            Divider().overlay(Color.white.opacity(0.08))
        }
    }
}

struct BudgetView: View {
    let transactions: [Transaction]
    @Binding var savingsGoal: Double
    let currency: SpendlyCurrency

    private var net: Double {
        transactions.reduce(0) { total, item in
            total + (item.type == .income ? item.amount : -item.amount)
        }
    }

    var body: some View {
        VStack(spacing: 14) {
            Panel(title: "Goal model") {
                ProgressView(value: min(max(net / max(savingsGoal, 1), 0), 1))
                    .tint(.blue)
                Text("You have reached \(Int(min(max(net / max(savingsGoal, 1), 0), 1) * 100))% of your goal.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Panel(title: "Savings goal") {
                Stepper("\(money(savingsGoal, currency: currency))", value: $savingsGoal, in: 0...20000, step: 50)
            }
        }
    }
}

struct ProfileView: View {
    let resetData: () -> Void
    @Binding var savingsGoal: Double
    @Binding var localeSettings: LocaleSettings
    let receiptArchive: [ReceiptArchive]

    var body: some View {
        VStack(spacing: 14) {
            Panel(title: "Region and currency") {
                Picker("Region", selection: $localeSettings.region) {
                    ForEach(SpendlyRegion.allCases) { region in
                        Text(region.rawValue).tag(region)
                    }
                }
                .pickerStyle(.menu)

                Picker("Currency", selection: $localeSettings.currency) {
                    ForEach(SpendlyCurrency.allCases) { currency in
                        Text(currency.label).tag(currency)
                    }
                }
                .pickerStyle(.menu)
            }
            Panel(title: "Privacy") {
                InsightRow(title: "Local-only storage", detail: "No remote database is required for the current app.")
                InsightRow(title: "Receipt OCR ready", detail: "Connect the Python OCR endpoint for receipt recognition.")
            }
            Panel(title: "Receipt archive") {
                if receiptArchive.isEmpty {
                    Text("No receipts archived yet.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(receiptArchive.prefix(5)) { receipt in
                        HStack(spacing: 12) {
                            if let imageData = receipt.imageData, let uiImage = UIImage(data: imageData) {
                                Image(uiImage: uiImage)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 48, height: 48)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            } else {
                                Image(systemName: "receipt")
                                    .frame(width: 48, height: 48)
                                    .liquidGlass(cornerRadius: 8, tint: .blue, intensity: 0.12)
                            }
                            VStack(alignment: .leading, spacing: 3) {
                                Text(receipt.merchant.isEmpty ? "Receipt" : receipt.merchant)
                                    .font(.subheadline.weight(.heavy))
                                Text("\(receipt.items.count) item\(receipt.items.count == 1 ? "" : "s") archived")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                    }
                }
            }
            Button("Reset Data", action: resetData)
                .buttonStyle(LiquidGlassButtonStyle(tint: .pink, foreground: Color(hex: 0x06111D)))
        }
    }
}

struct AddTransactionSheet: View {
    enum AddMode: String, CaseIterable {
        case oneTime = "One-Time"
        case recurring = "Recurring"
        case receipt = "Add Receipt"
    }

    let onAdd: ([Transaction], ReceiptArchive?) -> Void
    @State private var mode: AddMode = .oneTime
    @State private var description = ""
    @State private var amount = ""
    @State private var type: TransactionType = .expense
    @State private var category = "Food"
    @State private var recurringName = ""
    @State private var receiptText = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var receiptImageData: Data?
    @State private var receiptMerchant = ""
    @State private var receiptItems: [ReceiptLineItem] = []

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16, pinnedViews: [.sectionHeaders]) {
                Section {
                    content
                        .padding(.horizontal, 18)
                        .padding(.bottom, 30)
                } header: {
                    sheetHeader
                }
            }
        }
        .background(Color(hex: 0x121A24))
    }

    private var sheetHeader: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Add Transaction")
                    .font(.title2.weight(.black))
                Spacer()
            }
            Picker("Type", selection: $mode) {
                ForEach(AddMode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
        }
        .padding(18)
        .background(.regularMaterial)
    }

    @ViewBuilder
    private var content: some View {
        switch mode {
        case .oneTime:
            SpendlyTextField(title: "Description", text: $description)
            SpendlyTextField(title: "Amount", text: $amount, keyboard: .decimalPad)
            Picker("Transaction type", selection: $type) {
                ForEach(TransactionType.allCases, id: \.self) { type in
                    Text(type.rawValue).tag(type)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: type) { _, newValue in
                if newValue == .income { category = "Income" }
            }
            CategoryGridView(selection: $category)
            Button("Add Transaction") {
                addTransaction(description: description, selectedType: type)
            }
            .buttonStyle(PrimaryButtonStyle())
        case .recurring:
            SpendlyTextField(title: "Bill name", text: $recurringName)
            SpendlyTextField(title: "Amount", text: $amount, keyboard: .decimalPad)
            CategoryGridView(selection: $category)
            Button("Add Recurring Bill") {
                addTransaction(description: recurringName, selectedType: .expense)
            }
            .buttonStyle(PrimaryButtonStyle())
        case .receipt:
            Text("Take or upload a receipt photo, then run OCR from the Python endpoint.")
                .foregroundStyle(.secondary)
            HStack {
                PhotosPicker("Upload Receipt", selection: $selectedPhoto, matching: .images)
                    .buttonStyle(SecondaryButtonStyle())
                Button("Take Photo") {}
                    .buttonStyle(SecondaryButtonStyle())
            }
            .onChange(of: selectedPhoto) { _, newValue in
                loadReceiptImage(newValue)
            }
            if let receiptImageData, let uiImage = UIImage(data: receiptImageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.16)))
            }
            SpendlyTextField(title: "Merchant", text: $receiptMerchant)
            SpendlyTextEditor(title: "OCR text", text: $receiptText)
            Button("Parse Receipt") {
                parseReceiptText()
            }
                .buttonStyle(PrimaryButtonStyle())
            if !receiptItems.isEmpty {
                ReceiptCorrectionList(items: $receiptItems)
                Button("Add Corrected Items") {
                    addReceiptItems()
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
    }

    private func addTransaction(description: String, selectedType: TransactionType) {
        guard let amountValue = Double(amount), !description.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        onAdd([Transaction(id: UUID(), date: Date(), description: description, category: category, type: selectedType, amount: abs(amountValue))], nil)
    }

    private func loadReceiptImage(_ item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                await MainActor.run {
                    receiptImageData = data
                }
            }
        }
    }

    private func parseReceiptText() {
        receiptItems = receiptText
            .split(whereSeparator: \.isNewline)
            .compactMap { line in
                parseReceiptLine(String(line))
            }
    }

    private func parseReceiptLine(_ line: String) -> ReceiptLineItem? {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let parts = trimmed.split(separator: " ")
        guard let last = parts.last else { return nil }
        let amountText = String(last).replacingOccurrences(of: "$", with: "")
        guard Double(amountText.filter({ $0.isNumber || $0 == "." })) != nil else { return nil }
        let description = parts.dropLast().joined(separator: " ").trimmingCharacters(in: .whitespaces)
        guard !description.isEmpty, !description.lowercased().contains("total"), !description.lowercased().contains("subtotal"), !description.lowercased().contains("tax") else {
            return nil
        }
        return ReceiptLineItem(description: description, amountText: amountText, category: suggestedCategory(for: description))
    }

    private func addReceiptItems() {
        let corrected = receiptItems.filter { !$0.description.trimmingCharacters(in: .whitespaces).isEmpty && $0.amount > 0 }
        let transactions = corrected.map {
            Transaction(id: UUID(), date: Date(), description: $0.description, category: $0.category, type: .expense, amount: $0.amount)
        }
        let archive = ReceiptArchive(id: UUID(), date: Date(), merchant: receiptMerchant, imageData: receiptImageData, rawText: receiptText, items: corrected)
        onAdd(transactions, archive)
    }
}

struct ReceiptCorrectionList: View {
    @Binding var items: [ReceiptLineItem]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Correct receipt items")
                .font(.headline.weight(.black))
            ForEach($items) { $item in
                VStack(spacing: 10) {
                    HStack {
                        TextField("Item", text: $item.description)
                            .textFieldStyle(SpendlyTextFieldStyle())
                            .onChange(of: item.description) { _, newValue in
                                item.category = suggestedCategory(for: newValue)
                            }
                        TextField("Amount", text: $item.amountText)
                            .keyboardType(.decimalPad)
                            .frame(width: 92)
                            .textFieldStyle(SpendlyTextFieldStyle())
                    }
                    Picker("Category", selection: $item.category) {
                        ForEach(spendlyCategories) { category in
                            Text(category.id).tag(category.id)
                        }
                    }
                    .pickerStyle(.menu)
                }
                .padding(12)
                .liquidGlass(cornerRadius: 14, tint: .white, intensity: 0.06)
            }
        }
    }
}

struct CategoryGridView: View {
    @Binding var selection: String
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Category").font(.subheadline.weight(.heavy)).foregroundStyle(.secondary)
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(spendlyCategories) { category in
                    Button {
                        selection = category.id
                    } label: {
                        VStack(spacing: 7) {
                            Image(systemName: category.symbol)
                                .font(.headline)
                                .frame(width: 34, height: 34)
                                .background(selection == category.id ? Color.blue : Color(hex: 0x172231), in: Circle())
                            Text(category.id)
                                .font(.caption2.weight(.heavy))
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity, minHeight: 78)
                        .foregroundStyle(selection == category.id ? .white : .secondary)
                        .liquidGlass(cornerRadius: 12, tint: selection == category.id ? .blue : .white, intensity: selection == category.id ? 0.24 : 0.06)
                    }
                    .buttonStyle(PressScaleStyle())
                }
            }
        }
    }
}

struct LiquidFooter: View {
    @Binding var selectedTab: AppTab
    let openAdd: () -> Void

    var body: some View {
        HStack {
            FooterTab(tab: .overview, selectedTab: $selectedTab)
            FooterTab(tab: .activity, selectedTab: $selectedTab)
            Button(action: openAdd) {
                Image(systemName: "plus")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(Color(hex: 0x06111D))
                    .frame(width: 66, height: 66)
                    .liquidGlass(cornerRadius: 22, tint: .blue, intensity: 0.9)
                    .shadow(color: .blue.opacity(0.38), radius: 22, y: 10)
            }
            .buttonStyle(PressScaleStyle())
            .offset(y: -22)
            FooterTab(tab: .budget, selectedTab: $selectedTab)
            FooterTab(tab: .profile, selectedTab: $selectedTab)
        }
        .padding(8)
        .frame(maxWidth: .infinity)
        .frame(height: 74)
        .liquidGlass(cornerRadius: 24, tint: .blue, intensity: 0.12)
        .shadow(color: .black.opacity(0.38), radius: 28, y: 16)
    }
}

struct FooterTab: View {
    let tab: AppTab
    @Binding var selectedTab: AppTab

    var body: some View {
        Button {
            withAnimation(.spring(response: 0.32, dampingFraction: 0.75)) {
                selectedTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: tab.symbol).font(.headline)
                Text(tab.rawValue).font(.caption2.weight(.heavy))
            }
            .frame(maxWidth: .infinity, minHeight: 54)
            .foregroundStyle(selectedTab == tab ? .blue : .secondary)
            .liquidGlass(cornerRadius: 16, tint: selectedTab == tab ? .blue : .white, intensity: selectedTab == tab ? 0.18 : 0)
        }
        .buttonStyle(PressScaleStyle())
    }
}

struct Panel<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline.weight(.black))
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(cardBackground)
    }
}

struct InsightRow: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.subheadline.weight(.heavy))
            Text(detail).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(hex: 0x0E1925), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: 0x263445)))
    }
}

struct SpendlyTextField: View {
    let title: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title).font(.subheadline.weight(.heavy)).foregroundStyle(.secondary)
            TextField(title, text: $text)
                .keyboardType(keyboard)
                .textFieldStyle(SpendlyTextFieldStyle())
        }
    }
}

struct SpendlyTextEditor: View {
    let title: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title).font(.subheadline.weight(.heavy)).foregroundStyle(.secondary)
            TextEditor(text: $text)
                .frame(minHeight: 120)
                .scrollContentBackground(.hidden)
                .padding(10)
                .background(Color(hex: 0x0D1722), in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: 0x263445)))
        }
    }
}

struct SpendlyTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(12)
            .background(Color(hex: 0x0D1722), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: 0x263445)))
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.black))
            .frame(maxWidth: .infinity)
            .padding()
            .foregroundStyle(Color(hex: 0x06111D))
            .liquidGlass(cornerRadius: 12, tint: .blue, intensity: configuration.isPressed ? 0.78 : 0.62)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.heavy))
            .frame(maxWidth: .infinity)
            .padding()
            .foregroundStyle(.white)
            .liquidGlass(cornerRadius: 12, tint: .white, intensity: configuration.isPressed ? 0.15 : 0.08)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: configuration.isPressed)
    }
}

struct LiquidGlassButtonStyle: ButtonStyle {
    let tint: Color
    let foreground: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.black))
            .frame(maxWidth: .infinity)
            .padding()
            .foregroundStyle(foreground)
            .liquidGlass(cornerRadius: 12, tint: tint, intensity: configuration.isPressed ? 0.7 : 0.5)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: configuration.isPressed)
    }
}

struct CompactGlassButtonStyle: ButtonStyle {
    let tint: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.black))
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .foregroundStyle(.white)
            .liquidGlass(cornerRadius: 12, tint: tint, intensity: configuration.isPressed ? 0.28 : 0.16)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.75), value: configuration.isPressed)
    }
}

struct PressScaleStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.93 : 1)
            .animation(.spring(response: 0.26, dampingFraction: 0.72), value: configuration.isPressed)
    }
}

private var cardBackground: some View {
    RoundedRectangle(cornerRadius: 10)
        .fill(Color(hex: 0x121A24))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: 0x263445)))
}

struct LiquidGlassModifier: ViewModifier {
    let cornerRadius: CGFloat
    let tint: Color
    let intensity: Double

    func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.regularMaterial)
                    .overlay(tint.opacity(intensity))
            }
            .overlay(alignment: .top) {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [.white.opacity(0.28), .white.opacity(0.06), .clear],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(height: 24)
                    .padding(.horizontal, 3)
                    .padding(.top, 3)
                    .allowsHitTesting(false)
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(.white.opacity(0.2), lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}

extension View {
    func liquidGlass(cornerRadius: CGFloat, tint: Color = .white, intensity: Double = 0.08) -> some View {
        modifier(LiquidGlassModifier(cornerRadius: cornerRadius, tint: tint, intensity: intensity))
    }
}

extension Transaction {
    static let samples: [Transaction] = [
        Transaction(id: UUID(), date: Date(timeIntervalSinceNow: -86400 * 24), description: "Salary", category: "Income", type: .income, amount: 4300),
        Transaction(id: UUID(), date: Date(timeIntervalSinceNow: -86400 * 21), description: "Rent", category: "Housing", type: .expense, amount: 1450),
        Transaction(id: UUID(), date: Date(timeIntervalSinceNow: -86400 * 18), description: "Groceries", category: "Food", type: .expense, amount: 205.32),
        Transaction(id: UUID(), date: Date(timeIntervalSinceNow: -86400 * 15), description: "Lunches", category: "Food", type: .expense, amount: 91.60),
        Transaction(id: UUID(), date: Date(timeIntervalSinceNow: -86400 * 8), description: "New headphones", category: "Shopping", type: .expense, amount: 229.99),
        Transaction(id: UUID(), date: Date(timeIntervalSinceNow: -86400 * 3), description: "Credit card payment", category: "Debt", type: .expense, amount: 260)
    ]
}

func money(_ value: Double, currency: SpendlyCurrency = .usd) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = currency.rawValue
    return formatter.string(from: NSNumber(value: value)) ?? "$0.00"
}

func shortDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "MM/dd"
    return formatter.string(from: date)
}

func suggestedCategory(for description: String) -> String {
    let text = description.lowercased()
    if text.range(of: "coffee|milk|bread|egg|fruit|rice|chicken|beef|snack|pizza|grocery|food", options: .regularExpression) != nil {
        return "Food"
    }
    if text.range(of: "gas|fuel|parking|uber|lyft|taxi|transit|train|bus", options: .regularExpression) != nil {
        return "Transport"
    }
    if text.range(of: "pharmacy|medicine|vitamin|clinic|drug|health", options: .regularExpression) != nil {
        return "Health"
    }
    if text.range(of: "movie|ticket|game|book|music|concert", options: .regularExpression) != nil {
        return "Entertainment"
    }
    if text.range(of: "shirt|shoe|clothes|device|charger|headphone|home|kitchen", options: .regularExpression) != nil {
        return "Shopping"
    }
    return "Other"
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: alpha
        )
    }
}
