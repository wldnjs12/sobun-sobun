package com.ppuri.sobunsobun.community.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnonymousNicknamesTest {

    private static final Long AUTHOR = 100L;

    @Test
    void 글_작성자는_항상_글쓴이로_표시된다() {
        AnonymousNicknames nicknames = new AnonymousNicknames(AUTHOR, List.of(AUTHOR, 200L, AUTHOR));

        assertThat(nicknames.labelOf(AUTHOR)).isEqualTo("글쓴이");
    }

    @Test
    void 다른_작성자는_처음_등장한_순서대로_이웃_번호를_받는다() {
        AnonymousNicknames nicknames = new AnonymousNicknames(AUTHOR, List.of(300L, 200L, 400L));

        assertThat(nicknames.labelOf(300L)).isEqualTo("이웃 1");
        assertThat(nicknames.labelOf(200L)).isEqualTo("이웃 2");
        assertThat(nicknames.labelOf(400L)).isEqualTo("이웃 3");
    }

    @Test
    void 같은_사람은_같은_글_안에서_항상_같은_번호를_받는다() {
        AnonymousNicknames nicknames = new AnonymousNicknames(AUTHOR, List.of(200L, 300L, 200L, 300L, 200L));

        assertThat(nicknames.labelOf(200L)).isEqualTo("이웃 1");
        assertThat(nicknames.labelOf(300L)).isEqualTo("이웃 2");
    }

    @Test
    void 글쓴이가_중간에_댓글을_달아도_번호가_밀리지_않는다() {
        AnonymousNicknames nicknames = new AnonymousNicknames(AUTHOR, List.of(200L, AUTHOR, 300L));

        assertThat(nicknames.labelOf(300L)).isEqualTo("이웃 2");
    }
}
