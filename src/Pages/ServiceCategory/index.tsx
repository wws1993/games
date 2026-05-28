import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { Card, ListItem, Text } from '../../components/ui';
import {
  categoryServices,
  getCategoryById,
  isServiceCategoryId,
} from '../../data/mock';
import styles from './ServiceCategory.module.scss';

export default function ServiceCategoryPage() {
  const navigate = useNavigate();
  const { categoryId = '' } = useParams();
  if (!isServiceCategoryId(categoryId)) {
    return <Navigate to="/" replace />;
  }

  const category = getCategoryById(categoryId)!;
  const services = categoryServices[categoryId];

  return (
    <PageLayout withTabBar={false}>
      <p className={styles.desc}>{category.desc}</p>
      <Card padding={false}>
        {services.map((item) => (
          <ListItem
            key={item.id}
            title={item.name}
            subtitle={item.desc}
            onClick={() => navigate(`/service/${categoryId}/${item.id}`)}
          />
        ))}
      </Card>
      <Text variant="caption" className={styles.tip}>
        点击服务可查看详情，正式版将支持在线咨询与下单。
      </Text>
    </PageLayout>
  );
}
