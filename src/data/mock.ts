/** 本地 Mock 数据，第二步首页 MVP 使用 */

export type ServiceCategoryId = 'business' | 'legal' | 'social' | 'tech';

export interface ServiceCategory {
  id: ServiceCategoryId;
  name: string;
  shortName: string;
  desc: string;
  color: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  tag?: string;
  image: string;
  /** 图片遮罩渐变，保证文字可读 */
  overlay?: string;
}

export interface QuickService {
  id: string;
  name: string;
  categoryId: ServiceCategoryId;
}

export interface CategoryServiceItem {
  id: string;
  name: string;
  desc: string;
}

export interface ServiceDetail extends CategoryServiceItem {
  categoryId: ServiceCategoryId;
  categoryName: string;
  price: number;
  priceNote?: string;
  steps: string[];
  includes: string[];
}

export type OrderStatus =
  | 'pending_payment'
  | 'pending_service'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface OrderProgressStep {
  label: string;
  done: boolean;
  time?: string;
}

export interface Order {
  id: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  amount: number;
  discountAmount?: number;
  couponId?: string;
  status: OrderStatus;
  createdAt: string;
  progress: OrderProgressStep[];
  advisor: string;
  review?: OrderReview;
  invoice?: OrderInvoice;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: '待付款',
  pending_service: '待服务',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消',
};

export const orderStatusTabs: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'in_progress', label: '服务中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  tag: string;
  content: string[];
}

export interface Coupon {
  id: string;
  title: string;
  type: 'fixed' | 'percent';
  value: number;
  minAmount: number;
  expireAt: string;
}

export interface MemberPlan {
  id: string;
  name: string;
  price: number;
  unit: string;
  benefits: string[];
  recommended?: boolean;
}

export interface OrderReview {
  rating: number;
  content: string;
  createdAt: string;
}

export interface OrderInvoice {
  type: 'electronic' | 'paper';
  title: string;
  taxNo?: string;
  email?: string;
  status: 'pending' | 'issued';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'advisor';
  content: string;
  time: string;
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: 'business',
    name: '工商咨询',
    shortName: '工商',
    desc: '注册、变更、注销、地址',
    color: '#007AFF',
  },
  {
    id: 'legal',
    name: '法律咨询',
    shortName: '法律',
    desc: '劳动、婚姻、继承、工伤',
    color: '#5856D6',
  },
  {
    id: 'social',
    name: '社保咨询',
    shortName: '社保',
    desc: '退休、缴纳、迁移、备案',
    color: '#34C759',
  },
  {
    id: 'tech',
    name: '技术开发',
    shortName: '技术',
    desc: '网站、APP、小程序',
    color: '#FF9500',
  },
];

export const banners: BannerItem[] = [
  {
    id: 'b1',
    title: '新人专享礼包',
    subtitle: '注册即送 3 次免费咨询',
    tag: '限时',
    image: './img/home/banner/b1.jpg',
    overlay: 'linear-gradient(105deg, rgba(0, 60, 140, 0.72) 0%, rgba(0, 122, 255, 0.35) 55%, rgba(0, 0, 0, 0.15) 100%)',
  },
  {
    id: 'b2',
    title: '创业大礼包',
    subtitle: '注册+记账+商标 一站办理',
    tag: '热门',
    image: './img/home/banner/b2.jpg',
    overlay: 'linear-gradient(105deg, rgba(40, 30, 120, 0.75) 0%, rgba(88, 86, 214, 0.4) 55%, rgba(0, 0, 0, 0.18) 100%)',
  },
  {
    id: 'b3',
    title: '社保新政解读',
    subtitle: '退休与异地就医最新指南',
    image: './img/home/banner/b3.jpg',
    overlay: 'linear-gradient(105deg, rgba(10, 90, 50, 0.72) 0%, rgba(52, 199, 89, 0.38) 55%, rgba(0, 0, 0, 0.15) 100%)',
  },
];

export const quickServices: QuickService[] = [
  { id: 'q1', name: '公司注册', categoryId: 'business' },
  { id: 'q2', name: '公司变更', categoryId: 'business' },
  { id: 'q3', name: '劳动咨询', categoryId: 'legal' },
  { id: 'q4', name: '退休办理', categoryId: 'social' },
  { id: 'q5', name: '社保代缴', categoryId: 'social' },
  { id: 'q6', name: '小程序开发', categoryId: 'tech' },
  { id: 'q7', name: '公司注销', categoryId: 'business' },
  { id: 'q8', name: '网站建设', categoryId: 'tech' },
];

export const categoryServices: Record<ServiceCategoryId, CategoryServiceItem[]> = {
  business: [
    { id: 'b1', name: '公司注册', desc: '有限公司、个体户、合伙企业等类型办理' },
    { id: 'b2', name: '公司变更', desc: '法人、经营范围、注册地址变更' },
    { id: 'b3', name: '公司注销', desc: '清算指导与疑难注销方案' },
    { id: 'b4', name: '办公地址租赁', desc: '虚拟地址与实体办公室对接' },
  ],
  legal: [
    { id: 'l1', name: '劳动法律咨询', desc: '劳动合同、工资纠纷、辞退赔偿' },
    { id: 'l2', name: '婚姻法规咨询', desc: '离婚、财产分割、子女抚养' },
    { id: 'l3', name: '继承法规咨询', desc: '遗嘱、遗产分配、继承权' },
    { id: 'l4', name: '工伤咨询', desc: '工伤认定、赔偿标准、鉴定' },
  ],
  social: [
    { id: 's1', name: '退休咨询办理', desc: '年龄计算、养老金估算、代办' },
    { id: 's2', name: '社保缴纳咨询', desc: '个人代缴、企业开户、缴费标准' },
    { id: 's3', name: '社保迁移咨询', desc: '跨省跨市迁移流程与材料' },
    { id: 's4', name: '异地就医备案', desc: '备案流程、定点医院、报销比例' },
  ],
  tech: [
    { id: 't1', name: '网站建设', desc: '模板建站、定制开发、域名托管' },
    { id: 't2', name: 'APP 开发', desc: 'iOS/Android 原生与跨平台' },
    { id: 't3', name: '小程序开发', desc: '微信、支付宝、抖音小程序' },
    { id: 't4', name: '小游戏开发', desc: 'H5 与微信小游戏定制' },
  ],
};

export const newsList: NewsItem[] = [
  {
    id: 'n1',
    title: '2026 年社保缴费基数调整说明',
    summary: '各地缴费上下限发布，企业及个人缴费标准一览。',
    date: '05-18',
    tag: '社保政策',
    content: [
      '近日，各地人社部门陆续发布 2026 年度社会保险缴费基数上下限。用人单位应当据实申报职工缴费工资，并按月缴纳社会保险费。',
      '以个人身份参加企业职工基本养老保险的人员，可在缴费基数上下限之间自主选择缴费基数。具体标准请以当地人社部门公告为准。',
      '如需代缴或开户咨询，可通过易手办提交需求，顾问将为您提供一对一指导。',
    ],
  },
  {
    id: 'n2',
    title: '个体工商户年报填报指南',
    summary: '年报时间与材料清单，逾期后果与补报方式。',
    date: '05-15',
    tag: '工商办事',
    content: [
      '个体工商户应当于每年 1 月 1 日至 6 月 30 日，通过国家企业信用信息公示系统报送上一年度年度报告。',
      '未按时报送可能被列入经营异常名录，影响信用记录及后续办理工商、税务等业务。',
      '易手办提供年报代办与材料清单生成服务，欢迎在线咨询。',
    ],
  },
  {
    id: 'n3',
    title: '异地就医备案线上办理流程',
    summary: '国家平台备案步骤与定点医院查询方法。',
    date: '05-12',
    tag: '办事指南',
    content: [
      '参保人员可通过国家医保服务平台 APP 或地方医保小程序办理异地就医备案，支持跨省异地长期居住、异地转诊等类型。',
      '备案成功后，在备案地开通的定点医疗机构就医，可按政策直接结算或回参保地报销。',
      '备案前建议先确认参保地政策及定点医院名单，如有疑问可预约易手办社保顾问。',
    ],
  },
  {
    id: 'n4',
    title: '企业吸纳就业补贴申请须知',
    summary: '符合条件的企业可申请一次性吸纳就业补贴，附材料清单。',
    date: '05-10',
    tag: '政策解读',
    content: [
      '用人单位招用毕业年度或离校两年内未就业高校毕业生，签订一年以上劳动合同并缴纳社保的，可按规定申请吸纳就业补贴。',
      '申请一般通过当地人社部门线上平台提交，需准备劳动合同、社保缴费记录、毕业生身份证明等材料。',
      '具体金额与申报时限以属地政策为准，易手办可协助梳理材料并代办申报。',
    ],
  },
  {
    id: 'n5',
    title: '劳动合同解除与经济补偿常见问题',
    summary: '协商解除、违法解除情形下的补偿标准与维权路径。',
    date: '05-08',
    tag: '法律咨询',
    content: [
      '用人单位提出协商解除劳动合同的，应依法支付经济补偿；违法解除或终止劳动合同的，劳动者可主张赔偿金。',
      '经济补偿按劳动者在本单位工作的年限，每满一年支付一个月工资的标准计算，六个月以上不满一年按一年计。',
      '发生劳动争议可先申请调解或仲裁，易手办法律顾问可提供案情评估与文书代写服务。',
    ],
  },
  {
    id: 'n6',
    title: '高新技术企业认定申报窗口开启',
    summary: '2026 年度认定时间、核心指标与加计扣除优惠说明。',
    date: '05-05',
    tag: '工商办事',
    content: [
      '高新技术企业认定通常每年分批次受理，企业需满足知识产权、研发费用占比、高新技术产品收入等核心指标。',
      '通过认定的企业可减按 15% 税率缴纳企业所得税，并享受研发费用加计扣除等优惠。',
      '建议提前整理近三年财务数据与研发项目台账，易手办提供认定辅导与材料装订服务。',
    ],
  },
];

export const mockCoupons: Coupon[] = [
  { id: 'c1', title: '新人立减券', type: 'fixed', value: 50, minAmount: 100, expireAt: '2026-12-31' },
  { id: 'c2', title: '工商服务 9 折', type: 'percent', value: 10, minAmount: 500, expireAt: '2026-08-31' },
  { id: 'c3', title: '满 300 减 30', type: 'fixed', value: 30, minAmount: 300, expireAt: '2026-06-30' },
];

export const memberPlans: MemberPlan[] = [
  {
    id: 'm1',
    name: '银卡会员',
    price: 99,
    unit: '月',
    benefits: ['咨询 9 折', '代办 9.5 折', '优先排队'],
  },
  {
    id: 'm2',
    name: '金卡会员',
    price: 299,
    unit: '月',
    benefits: ['咨询 8 折', '代办 9 折', '专属顾问', '每月 2 次免费咨询'],
    recommended: true,
  },
  {
    id: 'm3',
    name: '企业会员',
    price: 999,
    unit: '月',
    benefits: ['多项免费服务', '专属客户经理', '企业管家套餐优先'],
  },
];

export function getNewsById(id: string): NewsItem | undefined {
  return newsList.find((n) => n.id === id);
}

export function getCouponById(id: string): Coupon | undefined {
  return mockCoupons.find((c) => c.id === id);
}

export function calcCouponDiscount(amount: number, coupon: Coupon): number {
  if (amount < coupon.minAmount) return 0;
  if (coupon.type === 'fixed') return Math.min(coupon.value, amount);
  return Math.floor((amount * coupon.value) / 100);
}

export function getOrderPayAmount(order: Order): number {
  return Math.max(0, order.amount - (order.discountAmount ?? 0));
}

/** 首页搜索：匹配服务名、资讯标题/摘要/标签 */
export function searchHomeContent(keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) {
    return { services: quickServices, news: newsList, hasQuery: false };
  }
  const services = quickServices.filter((s) => s.name.toLowerCase().includes(q));
  const news = newsList.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      n.tag.toLowerCase().includes(q),
  );
  const categories = serviceCategories.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q),
  );
  return { services, news, categories, hasQuery: true };
}

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'advisor',
    content: '您好，我是易手办顾问小陈，请问需要办理哪类业务？',
    time: '09:30',
  },
  {
    id: 'm2',
    role: 'user',
    content: '想咨询一下公司注册需要的材料。',
    time: '09:31',
  },
  {
    id: 'm3',
    role: 'advisor',
    content: '好的。注册有限公司一般需要：法人身份证、股东信息、公司章程、注册地址证明等。我可以为您生成材料清单。',
    time: '09:32',
  },
];

export function getCategoryById(id: string): ServiceCategory | undefined {
  return serviceCategories.find((c) => c.id === id);
}

export function isServiceCategoryId(id: string): id is ServiceCategoryId {
  return serviceCategories.some((c) => c.id === id);
}

const serviceMeta: Record<
  string,
  { price: number; priceNote?: string; steps: string[]; includes: string[] }
> = {
  b1: {
    price: 899,
    priceNote: '含工商核名与执照代办',
    steps: ['提交资料', '核名与预审', '领取执照', '刻章备案'],
    includes: ['核名', '执照代办', '顾问答疑'],
  },
  b2: { price: 599, steps: ['确认变更项', '材料准备', '提交工商', '领取新照'], includes: ['材料清单', '代办提交'] },
  b3: { price: 1299, steps: ['清算辅导', '税务注销', '工商注销', '银行账户注销'], includes: ['全流程顾问'] },
  b4: { price: 200, priceNote: '/月起', steps: ['选址需求', '匹配地址', '签约入驻'], includes: ['地址对接', '合同模板'] },
  l1: { price: 99, steps: ['描述问题', '顾问分析', '出具建议'], includes: ['图文咨询 24h 内回复'] },
  l2: { price: 199, steps: ['预约咨询', '律师对接', '方案建议'], includes: ['30 分钟电话'] },
  l3: { price: 199, steps: ['案情了解', '法律分析', '文书建议'], includes: ['图文+电话'] },
  l4: { price: 299, steps: ['材料评估', '认定辅导', '赔偿测算'], includes: ['专项顾问'] },
  s1: { price: 399, steps: ['资格测算', '材料准备', '提交办理', '领取待遇'], includes: ['退休代办'] },
  s2: { price: 150, priceNote: '/月·代缴', steps: ['确认险种', '代缴服务', '缴费凭证'], includes: ['月度代缴'] },
  s3: { price: 499, steps: ['迁移评估', '材料准备', '两地办理'], includes: ['迁移代办'] },
  s4: { price: 0, priceNote: '免费咨询', steps: ['备案条件', '线上填报', '定点医院'], includes: ['流程指导'] },
  t1: { price: 3999, steps: ['需求沟通', '设计开发', '上线交付'], includes: ['模板或定制'] },
  t2: { price: 29999, steps: ['需求评估', '原型确认', '开发测试', '上架发布'], includes: ['原生/跨平台'] },
  t3: { price: 8999, steps: ['需求梳理', 'UI 设计', '开发联调', '提审上线'], includes: ['微信/支付宝'] },
  t4: { price: 19999, steps: ['玩法设计', '开发测试', '上线运营'], includes: ['H5/小游戏'] },
};

const serviceDetails: ServiceDetail[] = [];

for (const cat of serviceCategories) {
  for (const item of categoryServices[cat.id]) {
    const meta = serviceMeta[item.id] ?? {
      price: 99,
      steps: ['提交需求', '顾问对接', '服务交付'],
      includes: ['基础咨询'],
    };
    serviceDetails.push({
      ...item,
      categoryId: cat.id,
      categoryName: cat.name,
      price: meta.price,
      priceNote: meta.priceNote,
      steps: meta.steps,
      includes: meta.includes,
    });
  }
}

export function getServiceDetail(serviceId: string): ServiceDetail | undefined {
  return serviceDetails.find((s) => s.id === serviceId);
}

export function getAllServiceDetails(): ServiceDetail[] {
  return serviceDetails;
}

export const initialMockOrders: Order[] = [
  {
    id: 'ord_demo_1',
    serviceId: 'b1',
    serviceName: '公司注册',
    categoryName: '工商咨询',
    amount: 899,
    status: 'in_progress',
    createdAt: '2026-05-10T08:00:00.000Z',
    advisor: '顾问小陈',
    progress: [
      { label: '提交订单', done: true, time: '05-10 08:00' },
      { label: '支付费用', done: true, time: '05-10 08:05' },
      { label: '顾问接单', done: true, time: '05-10 09:00' },
      { label: '办理完成', done: false },
    ],
  },
  {
    id: 'ord_demo_2',
    serviceId: 'l1',
    serviceName: '劳动法律咨询',
    categoryName: '法律咨询',
    amount: 99,
    status: 'completed',
    createdAt: '2026-04-20T10:00:00.000Z',
    advisor: '顾问小王',
    progress: [
      { label: '提交订单', done: true, time: '04-20' },
      { label: '支付费用', done: true, time: '04-20' },
      { label: '顾问接单', done: true, time: '04-20' },
      { label: '办理完成', done: true, time: '04-21' },
    ],
  },
];

/** 支持费用计算器的服务 ID */
export const feeCalculatorServiceIds = ['b1', 'b2', 't1', 't3'];
