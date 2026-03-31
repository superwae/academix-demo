import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { courseService, type CourseDto, type PagedResult } from '../services/courseService';
import { toast } from 'sonner';
import { Search, Star, Filter, X } from 'lucide-react';

export function PublicCoursesPage() {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [sortDescending, setSortDescending] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    loadCourses();
  }, [pageNumber, searchTerm, sortBy, sortDescending, selectedCategory]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const request = {
        pageNumber,
        pageSize,
        searchTerm: searchTerm || undefined,
        sortBy: sortBy || undefined,
        sortDescending,
      };
      const response = await courseService.getCourses(request);
      setCourses(response.items);
      setTotalCount(response.totalCount);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(response.items.map((c) => c.category))
      ).sort();
      setCategories((prev) => {
        const combined = Array.from(new Set([...prev, ...uniqueCategories]));
        return combined.sort();
      });
    } catch (error) {
      toast.error('Failed to load courses', {
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPageNumber(1);
    loadCourses();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const filteredCourses = useMemo(() => {
    if (selectedCategory === 'All') return courses;
    return courses.filter((c) => c.category === selectedCategory);
  }, [courses, selectedCategory]);

  return (
    <div className="space-y-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold">Course Catalog</h1>
          <p className="text-muted-foreground mt-2">
            Browse our collection of courses and find the perfect one for you
          </p>
        </div>

        {/* Search and Filters */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11"
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value);
                setPageNumber(1);
              }}
              options={[
                { value: 'rating', label: 'Sort by Rating' },
                { value: 'title', label: 'Sort by Title' },
                { value: 'created', label: 'Sort by Date' },
              ]}
            />
            {selectedCategory !== 'All' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedCategory('All')}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filter
              </Button>
            )}
          </div>
        </form>

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'All' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('All')}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedCategory(category);
                  setPageNumber(1);
                }}
              >
                {category}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCourses.length} of {totalCount} courses
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <Link to={`/courses/${course.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {course.instructorName} • {course.category}
                        </CardDescription>
                      </div>
                      {course.isFeatured && (
                        <Badge variant="default" className="shrink-0">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {formatRating(course.rating)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({course.ratingCount})
                        </span>
                      </div>
                      <Badge variant="secondary">{course.level}</Badge>
                    </div>
                    {course.price && (
                      <div className="text-lg font-bold">
                        ${course.price.toFixed(2)}
                      </div>
                    )}
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No courses found</p>
          <p className="text-muted-foreground text-sm mt-2">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pageNumber} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
            disabled={pageNumber === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

