import { createHashRouter } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { SubLayout } from './layouts/SubLayout';
import HomePage from './Pages/Home';
import ServicePage from './Pages/Service';
import ServiceCategoryPage from './Pages/ServiceCategory';
import ServiceDetailPage from './Pages/ServiceDetail';
import ConsultPage from './Pages/Consult';
import OrderPage from './Pages/Order';
import OrderDetailPage from './Pages/OrderDetail';
import OrderReviewPage from './Pages/OrderReview';
import OrderInvoicePage from './Pages/OrderInvoice';
import PaymentPage from './Pages/Payment';
import PaymentResultPage from './Pages/PaymentResult';
import ProfilePage from './Pages/Profile';
import ProfileMessagesPage from './Pages/ProfileMessages';
import ProfileCouponsPage from './Pages/ProfileCoupons';
import ProfileHelpPage from './Pages/ProfileHelp';
import ProfileAboutPage from './Pages/ProfileAbout';
import NewsDetailPage from './Pages/NewsDetail';
import LoginPage from './Pages/Login';
import DemoPage from './Pages/Demo';

export const router = createHashRouter([
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'service', element: <ServicePage /> },
      { path: 'consult', element: <ConsultPage /> },
      { path: 'order', element: <OrderPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: 'login',
    element: <LoginPage />,
  },
  {
    element: <SubLayout />,
    children: [
      { path: 'service/:categoryId', element: <ServiceCategoryPage /> },
      { path: 'service/:categoryId/:serviceId', element: <ServiceDetailPage /> },
      { path: 'order/:orderId', element: <OrderDetailPage /> },
      { path: 'order/:orderId/review', element: <OrderReviewPage /> },
      { path: 'order/:orderId/invoice', element: <OrderInvoicePage /> },
      { path: 'pay/:orderId', element: <PaymentPage /> },
      { path: 'pay/:orderId/result', element: <PaymentResultPage /> },
      { path: 'news/:newsId', element: <NewsDetailPage /> },
      { path: 'profile/messages', element: <ProfileMessagesPage />, handle: { title: '消息中心' } },
      { path: 'profile/coupons', element: <ProfileCouponsPage />, handle: { title: '我的优惠券' } },
      { path: 'profile/help', element: <ProfileHelpPage />, handle: { title: '帮助中心' } },
      { path: 'profile/about', element: <ProfileAboutPage />, handle: { title: '关于我们' } },
      { path: 'demo', element: <DemoPage />, handle: { title: '组件演示' } },
    ],
  },
]);
