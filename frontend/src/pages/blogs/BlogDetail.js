import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchBlogById, likeBlog, unlikeBlog } from '../../store/slices/blogSlice';
import { fetchComments, addComment, clearComments } from '../../store/slices/commentSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { currentBlog, loading, error } = useSelector((state) => state.blogs);
  const { comments, loading: commentsLoading } = useSelector((state) => state.comments);
  
  const [commentText, setCommentText] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchBlogById(id));
    }
  }, [dispatch, id]);

  // Fetch comments only after blog is loaded
  useEffect(() => {
    if (id && currentBlog && currentBlog._id === id) {
      dispatch(fetchComments({ blogId: id }));
    }
  }, [dispatch, id, currentBlog]);

  // Cleanup comments when component unmounts or blog ID changes
  useEffect(() => {
    return () => {
      dispatch(clearComments());
    };
  }, [dispatch, id]);

  const handleLike = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (currentBlog?.likes?.includes(user?._id)) {
      dispatch(unlikeBlog(id));
    } else {
      dispatch(likeBlog(id));
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    await dispatch(addComment({ blogId: id, content: commentText }));
    setCommentText('');
    setShowCommentForm(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadTime = (content) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Blog Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!currentBlog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isLiked = currentBlog.likes?.includes(user?._id);
  const readTime = getReadTime(currentBlog.content);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Blog Header */}
        <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Featured Image */}
          {currentBlog.image && (
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={currentBlog.image}
                alt={currentBlog.title}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Blog Content */}
          <div className="p-8">
            {/* Title and Meta */}
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {currentBlog.title}
              </h1>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {currentBlog.author?.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="font-medium text-gray-700">
                      {currentBlog.author?.username || 'Anonymous'}
                    </span>
                  </div>
                  <span>•</span>
                  <span>{formatDate(currentBlog.createdAt)}</span>
                  <span>•</span>
                  <span>{readTime} min read</span>
                </div>
                
                {isAuthenticated && currentBlog.author?._id === user?._id && (
                  <Link
                    to={`/edit-blog/${currentBlog._id}`}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>

            {/* Blog Content */}
            <div className="prose prose-lg max-w-none prose-custom mb-8">
              <div dangerouslySetInnerHTML={{ __html: currentBlog.content }} />
            </div>

            {/* Tags */}
            {currentBlog.tags && currentBlog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {currentBlog.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="badge badge-primary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Like Button */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  isLiked
                    ? 'text-red-600 bg-red-50 hover:bg-red-100'
                    : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
                }`}
              >
                <svg
                  className={`w-5 h-5 ${isLiked ? 'fill-current' : 'stroke-current fill-none'}`}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span>{currentBlog.likes?.length || 0} likes</span>
              </button>

              <button
                onClick={() => setShowCommentForm(!showCommentForm)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span>{comments.length} comments</span>
              </button>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Comments ({comments.length})
          </h3>

          {/* Add Comment Form */}
          {isAuthenticated && (
            <div className="mb-6">
              {showCommentForm ? (
                <form onSubmit={handleComment} className="space-y-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="input w-full h-24 resize-none"
                    required
                  />
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCommentForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Post Comment
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  Write a comment...
                </button>
              )}
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-6">
            {commentsLoading ? (
              <LoadingSpinner />
            ) : comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">
                        {comment.author?.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">
                          {comment.author?.username || 'Anonymous'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetail; 